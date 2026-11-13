import { AiChatThread, AiMessage, AiMode } from '../types';

export const DEFAULT_CHAT_TITLE = 'নতুন চ্যাট';

export function deriveThreadTitleFromPrompt(prompt: string): string {
  const normalized = (prompt || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return DEFAULT_CHAT_TITLE;
  if (normalized.length <= 42) return normalized;
  return `${normalized.slice(0, 42).trim()}...`;
}

export function createAiThread(options?: {
  id?: string;
  title?: string;
  mode?: AiMode;
  pinned?: boolean;
  now?: number;
}): AiChatThread {
  const now = options?.now ?? Date.now();
  return {
    id: options?.id || `chat-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: options?.title?.trim() || DEFAULT_CHAT_TITLE,
    pinned: Boolean(options?.pinned),
    pinnedAt: options?.pinned ? now : null,
    createdAt: now,
    updatedAt: now,
    mode: options?.mode || 'general',
    messages: [],
  };
}

/**
 * Keeps pinned chats strictly at the top (most recently pinned/updated first),
 * followed by unpinned chats ordered by newest updatedAt.
 */
export function sortAiThreads(threads: AiChatThread[]): AiChatThread[] {
  return [...threads].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    if (a.pinned && b.pinned) {
      const pinDiff = (b.pinnedAt || b.updatedAt) - (a.pinnedAt || a.updatedAt);
      if (pinDiff !== 0) return pinDiff;
    }
    return b.updatedAt - a.updatedAt;
  });
}

export function togglePinAiThread(
  threads: AiChatThread[],
  threadId: string,
  now: number = Date.now()
): AiChatThread[] {
  const updated = threads.map((t) => {
    if (t.id !== threadId) return t;
    const nextPinned = !t.pinned;
    return {
      ...t,
      pinned: nextPinned,
      pinnedAt: nextPinned ? now : null,
      updatedAt: Math.max(t.updatedAt, now),
    };
  });
  return sortAiThreads(updated);
}

export function renameAiThread(
  threads: AiChatThread[],
  threadId: string,
  rawTitle: string,
  now: number = Date.now()
): AiChatThread[] {
  const cleaned = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!cleaned) return threads;

  const updated = threads.map((t) =>
    t.id === threadId
      ? {
          ...t,
          title: cleaned,
          updatedAt: Math.max(t.updatedAt, now),
        }
      : t
  );
  return sortAiThreads(updated);
}

export function deleteAiThread(threads: AiChatThread[], threadId: string): AiChatThread[] {
  return threads.filter((t) => t.id !== threadId);
}

export function setThreadMode(
  threads: AiChatThread[],
  threadId: string,
  mode: AiMode
): AiChatThread[] {
  return threads.map((t) => (t.id === threadId ? { ...t, mode } : t));
}

export function appendMessageToThread(
  threads: AiChatThread[],
  threadId: string,
  message: AiMessage
): AiChatThread[] {
  const updated = threads.map((t) => {
    if (t.id !== threadId) return t;
    const shouldAutoTitle =
      message.role === 'user' &&
      t.messages.length === 0 &&
      (t.title === DEFAULT_CHAT_TITLE || !t.title.trim());

    return {
      ...t,
      title: shouldAutoTitle ? deriveThreadTitleFromPrompt(message.text) : t.title,
      messages: [...t.messages, message],
      updatedAt: Math.max(t.updatedAt, message.createdAt),
    };
  });
  return sortAiThreads(updated);
}

export function updateMessageInThread(
  threads: AiChatThread[],
  threadId: string,
  messageId: string,
  updater: (msg: AiMessage) => AiMessage
): AiChatThread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t;
    return {
      ...t,
      messages: t.messages.map((m) => (m.id === messageId ? updater(m) : m)),
      updatedAt: Date.now(),
    };
  });
}

export function mergeAiThreads(
  cloudThreads: AiChatThread[],
  localThreads: AiChatThread[]
): AiChatThread[] {
  const map = new Map<string, AiChatThread>();

  for (const local of localThreads) {
    if (local && local.id) {
      map.set(local.id, local);
    }
  }

  for (const cloud of cloudThreads) {
    if (!cloud || !cloud.id) continue;
    const existing = map.get(cloud.id);
    if (!existing) {
      map.set(cloud.id, cloud);
      continue;
    }

    // Prefer whichever version has more messages or newer updatedAt
    const cloudMsgCount = cloud.messages?.length || 0;
    const localMsgCount = existing.messages?.length || 0;
    if (cloud.updatedAt > existing.updatedAt || cloudMsgCount > localMsgCount) {
      map.set(cloud.id, cloud);
    }
  }

  return sortAiThreads(Array.from(map.values()));
}

export function filterAiThreads(threads: AiChatThread[], queryText: string): AiChatThread[] {
  const q = queryText.trim().toLowerCase();
  if (!q) return sortAiThreads(threads);
  return sortAiThreads(
    threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.text.toLowerCase().includes(q))
    )
  );
}

function getStorageKey(userId: string): string {
  const safeId = (userId || 'guest_user').trim() || 'guest_user';
  return `bashar_cloud_ai_chats_${safeId}`;
}

export function loadAiThreadsFromStorage(userId: string): AiChatThread[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortAiThreads(
      parsed.filter((item): item is AiChatThread => Boolean(item && typeof item.id === 'string'))
    );
  } catch {
    return [];
  }
}

export function saveAiThreadsToStorage(userId: string, threads: AiChatThread[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sortAiThreads(threads).slice(0, 60)));
  } catch {
    // Best effort storage persistence
  }
}

export function clearAiThreadsFromStorage(userId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // Ignore storage removal errors
  }
}
