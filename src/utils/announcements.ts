import { AdminAnnouncement, AnnouncementCategory } from '../types';

export const ANNOUNCEMENTS_STORAGE_KEY = 'bashar_cloud_announcements';
export const NOTIFICATIONS_LAST_READ_KEY = 'bashar_cloud_notifications_last_read';

export interface AnnouncementCategoryMeta {
  id: AnnouncementCategory;
  bnLabel: string;
  enLabel: string;
  badgeDark: string;
  badgeLight: string;
  accentBar: string;
  iconBgDark: string;
  iconBgLight: string;
}

export const ANNOUNCEMENT_CATEGORY_META: Record<AnnouncementCategory, AnnouncementCategoryMeta> = {
  offer: {
    id: 'offer',
    bnLabel: 'অফার / প্রমোশন',
    enLabel: 'Offer',
    badgeDark: 'bg-amber-500/20 text-amber-300 border-amber-400/35',
    badgeLight: 'bg-amber-50 text-amber-800 border-amber-300',
    accentBar: 'from-amber-500 via-orange-500 to-rose-500',
    iconBgDark: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    iconBgLight: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  important: {
    id: 'important',
    bnLabel: 'জরুরি নোটিশ',
    enLabel: 'Important',
    badgeDark: 'bg-rose-500/20 text-rose-300 border-rose-400/35',
    badgeLight: 'bg-rose-50 text-rose-800 border-rose-300',
    accentBar: 'from-rose-500 via-pink-500 to-amber-500',
    iconBgDark: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    iconBgLight: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  update: {
    id: 'update',
    bnLabel: 'নতুন আপডেট',
    enLabel: 'Update',
    badgeDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35',
    badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    accentBar: 'from-emerald-500 via-teal-500 to-sky-500',
    iconBgDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    iconBgLight: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  general: {
    id: 'general',
    bnLabel: 'সাধারণ বিজ্ঞাপন',
    enLabel: 'Announcement',
    badgeDark: 'bg-blue-500/20 text-sky-300 border-sky-400/35',
    badgeLight: 'bg-blue-50 text-blue-800 border-blue-300',
    accentBar: 'from-blue-500 via-indigo-500 to-sky-400',
    iconBgDark: 'bg-blue-500/20 text-sky-300 border-sky-400/30',
    iconBgLight: 'bg-blue-100 text-blue-700 border-blue-200',
  },
};

export function isSafeExternalUrl(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeAnnouncementCategory(cat?: string): AnnouncementCategory {
  if (cat === 'offer' || cat === 'important' || cat === 'update' || cat === 'general') {
    return cat;
  }
  return 'general';
}

export interface BuildAnnouncementInput {
  title: string;
  message: string;
  category?: AnnouncementCategory;
  imageUrl?: string;
  actionLabel?: string;
  actionUrl?: string;
  now?: number;
}

export function buildAnnouncement(input: BuildAnnouncementInput): AdminAnnouncement {
  const now = input.now ?? Date.now();
  const title = (input.title || '').trim().slice(0, 180);
  const message = (input.message || '').trim().slice(0, 2000);
  if (!title) {
    throw new Error('বিজ্ঞাপনের শিরোনাম (Title) লিখুন।');
  }
  if (!message) {
    throw new Error('বিজ্ঞাপনের বিস্তারিত বিবরণ লিখুন।');
  }

  const rawActionUrl = (input.actionUrl || '').trim();
  if (rawActionUrl && !isSafeExternalUrl(rawActionUrl)) {
    throw new Error('লিংক অবশ্যই http:// অথবা https:// দিয়ে শুরু হতে হবে।');
  }

  const category = normalizeAnnouncementCategory(input.category);
  const createdAt = new Date(now).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cleanImageUrl =
    input.imageUrl && (input.imageUrl.startsWith('data:image/') || isSafeExternalUrl(input.imageUrl))
      ? input.imageUrl
      : undefined;

  const cleanActionLabel = rawActionUrl
    ? (input.actionLabel || '').trim().slice(0, 80) || 'বিস্তারিত দেখুন'
    : undefined;

  return {
    id: `ad-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    message,
    category,
    imageUrl: cleanImageUrl,
    actionLabel: cleanActionLabel,
    actionUrl: rawActionUrl || undefined,
    createdAt,
    createdTimestamp: now,
  };
}

export function sortAnnouncementsNewestFirst(list: AdminAnnouncement[]): AdminAnnouncement[] {
  const seen = new Set<string>();
  const deduped: AdminAnnouncement[] = [];
  for (const item of list) {
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push({
      ...item,
      category: normalizeAnnouncementCategory(item.category),
      createdTimestamp: Number(item.createdTimestamp) || 0,
    });
  }
  return deduped.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
}

export function isAnnouncementUnread(ad: AdminAnnouncement, lastReadTimestamp: number): boolean {
  return (Number(ad.createdTimestamp) || 0) > (Number(lastReadTimestamp) || 0);
}

export function getUnreadAnnouncementCount(
  list: AdminAnnouncement[],
  lastReadTimestamp: number
): number {
  return list.filter((ad) => isAnnouncementUnread(ad, lastReadTimestamp)).length;
}

export function filterAnnouncements(
  list: AdminAnnouncement[],
  options: {
    filter?: 'all' | 'unread';
    lastReadTimestamp?: number;
    query?: string;
  } = {}
): AdminAnnouncement[] {
  const filter = options.filter || 'all';
  const lastRead = options.lastReadTimestamp ?? 0;
  const q = (options.query || '').trim().toLowerCase();

  return sortAnnouncementsNewestFirst(list).filter((ad) => {
    if (filter === 'unread' && !isAnnouncementUnread(ad, lastRead)) {
      return false;
    }
    if (q) {
      const meta = ANNOUNCEMENT_CATEGORY_META[normalizeAnnouncementCategory(ad.category)];
      const haystack = `${ad.title} ${ad.message} ${meta.bnLabel} ${meta.enLabel}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function loadAnnouncementsFromStorage(): AdminAnnouncement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortAnnouncementsNewestFirst(parsed) : [];
  } catch {
    return [];
  }
}

export function saveAnnouncementsToStorage(list: AdminAnnouncement[]): void {
  try {
    localStorage.setItem(
      ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(sortAnnouncementsNewestFirst(list))
    );
  } catch {}
}

export function loadLastReadNotificationTs(): number {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_LAST_READ_KEY);
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 0;
  } catch {
    return 0;
  }
}

export function saveLastReadNotificationTs(ts: number): void {
  try {
    localStorage.setItem(NOTIFICATIONS_LAST_READ_KEY, String(Math.max(0, Number(ts) || 0)));
  } catch {}
}
