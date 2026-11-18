export interface NormalizedHistoryTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface IncomingHistoryItemLike {
  role?: unknown;
  text?: unknown;
}

export interface AiAttachmentInput {
  name?: string;
  snippet?: string;
  imageDataUrl?: string;
  mimeType?: string;
}

export interface AiCloudSummaryInput {
  totalFiles?: number;
  usedText?: string;
  totalLimitGB?: number;
  imagesCount?: number;
  videosCount?: number;
  audiosCount?: number;
  docsCount?: number;
  recentNames?: string[];
}

export type GeminiUserPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

/**
 * Resolves a Gemini API key cleanly from process.env without letting surrounding
 * whitespace, quotes, or template placeholders break SDK calls.
 */
export function resolveGeminiApiKey(
  env: Record<string, string | undefined>
): string {
  const candidates = [
    env.GEMINI_API_KEY,
    env.API_KEY,
    env.GOOGLE_API_KEY,
    env.GOOGLE_GENERATIVE_AI_API_KEY,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const cleaned = candidate.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (!cleaned) continue;
    if (
      cleaned === 'MY_GEMINI_API_KEY' ||
      cleaned === 'YOUR_API_KEY' ||
      cleaned === 'undefined' ||
      cleaned === 'null'
    ) {
      continue;
    }
    return cleaned;
  }

  return '';
}

/**
 * Normalizes multi-turn chat history into clean alternating user/model turns
 * so retries, failed turns, or leading model messages cannot trigger 400 INVALID_ARGUMENT.
 */
export function normalizeAiHistory(
  rawHistory: unknown,
  maxTurns = 24
): NormalizedHistoryTurn[] {
  if (!Array.isArray(rawHistory)) return [];

  const turns: NormalizedHistoryTurn[] = [];
  for (const item of rawHistory as IncomingHistoryItemLike[]) {
    if (!item || (item.role !== 'user' && item.role !== 'model')) continue;
    if (typeof item.text !== 'string') continue;
    const trimmed = item.text.trim();
    if (!trimmed) continue;

    // Gemini chat histories must start with a 'user' turn
    if (turns.length === 0 && item.role !== 'user') continue;

    const prev = turns[turns.length - 1];
    if (prev && prev.role === item.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n\n${trimmed}`;
    } else {
      turns.push({
        role: item.role,
        parts: [{ text: trimmed }],
      });
    }
  }

  if (turns.length <= maxTurns) return turns;
  const sliced = turns.slice(-maxTurns);
  // Keep valid leading 'user' turn after slicing
  while (sliced.length > 0 && sliced[0].role !== 'user') {
    sliced.shift();
  }
  return sliced;
}

/**
 * Validates and extracts mimeType + base64 payload from an image Data URL.
 */
export function parseBase64DataUrl(
  dataUrl: unknown,
  maxBase64Chars = 3_500_000
): { mimeType: string; data: string } | null {
  if (typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  if (!ALLOWED_IMAGE_MIMES.has(rawMime)) return null;

  const data = match[2];
  if (!data || data.length > maxBase64Chars) return null;
  return { mimeType, data };
}

/**
 * Builds SDK-ready message parts supporting plain text, code/document context, and images.
 */
export function buildUserParts(
  rawMessage: string,
  attachment?: AiAttachmentInput | null
): GeminiUserPart[] {
  const parts: GeminiUserPart[] = [];
  const parsedImage = attachment?.imageDataUrl
    ? parseBase64DataUrl(attachment.imageDataUrl)
    : null;

  if (parsedImage) {
    parts.push({
      inlineData: {
        mimeType: parsedImage.mimeType,
        data: parsedImage.data,
      },
    });
  }

  const cleanName = typeof attachment?.name === 'string' ? attachment.name.trim().slice(0, 160) : '';
  const cleanSnippet =
    typeof attachment?.snippet === 'string' ? attachment.snippet.trim().slice(0, 12000) : '';

  if (parsedImage && cleanName) {
    parts.push({
      text: `[Attached Image: ${cleanName}]\n\nUser Question:\n${rawMessage}`,
    });
  } else if (cleanSnippet && cleanName) {
    parts.push({
      text: `[Attached File: ${cleanName}]\n\`\`\`\n${cleanSnippet}\n\`\`\`\n\nUser Question:\n${rawMessage}`,
    });
  } else {
    parts.push({ text: rawMessage });
  }

  return parts;
}

/**
 * Formats compact, non-sensitive Cloud Drive summary context for the AI assistant.
 */
export function buildCloudSummaryText(summary?: AiCloudSummaryInput | null): string {
  if (!summary || typeof summary !== 'object') return '';
  const totalFiles = Number.isFinite(summary.totalFiles) ? Number(summary.totalFiles) : 0;
  const usedText = typeof summary.usedText === 'string' ? summary.usedText.slice(0, 40) : '0 B';
  const totalLimitGB = Number.isFinite(summary.totalLimitGB) ? Number(summary.totalLimitGB) : 1000;
  const counts = [
    `Images: ${Number(summary.imagesCount) || 0}`,
    `Videos: ${Number(summary.videosCount) || 0}`,
    `Audios: ${Number(summary.audiosCount) || 0}`,
    `Documents: ${Number(summary.docsCount) || 0}`,
  ].join(', ');

  const names = Array.isArray(summary.recentNames)
    ? summary.recentNames
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        .slice(0, 12)
        .map((n) => n.trim().slice(0, 80))
    : [];

  return [
    `User's Bashar Cloud Drive status: ${totalFiles} total items, ${usedText} used of ${totalLimitGB} GB (${counts}).`,
    names.length > 0 ? `Recent files/folders: ${names.join(', ')}.` : 'The Cloud Drive currently has no uploaded files.',
  ].join(' ');
}

/**
 * Builds the system instruction for Bashar Cloud AI.
 */
export function buildSystemInstruction(
  userName?: string,
  cloudSummary?: AiCloudSummaryInput | null
): string {
  const userLine = userName ? `The current user's name is "${userName}".` : '';
  const driveLine = buildCloudSummaryText(cloudSummary);

  return [
    'You are Bashar Cloud AI, a senior, ultra-reliable, and articulate AI assistant built directly into Bashar Cloud.',
    userLine,
    driveLine,
    'Capabilities: Excel across software engineering & debugging, mathematics & science, academic study, business & legal/official writing, translation, data organization, image analysis (when an image is attached), and Cloud Drive file help.',
    'Language matching: Respond in natural, polite, fluent Bengali when the user writes in Bengali (or asks in Bengali), in crisp English when they write in English, or seamlessly combine accurate English technical terms within Bengali.',
    'Formatting: Use clean Markdown headings (## / ###), concise bullet or numbered lists, Markdown tables for comparisons/schedules/plans, and fenced code blocks with explicit language tags (e.g., ```ts, ```python, ```bash). Start directly with a clear answer without empty filler.',
    'Honesty & Precision: Never fabricate file contents, API results, or facts. If something is ambiguous or missing, clarify concisely.',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface ParsedSseEvent {
  type?: string;
  text?: string;
  model?: string;
  error?: string;
}

/**
 * Splits SSE stream text across both LF (\n\n) and CRLF (\r\n\r\n) boundaries,
 * returning parsed JSON data payloads and any incomplete trailing remainder.
 */
export function parseSseChunks(
  buffer: string,
  flushRemainder = false
): { events: ParsedSseEvent[]; remainder: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const rawParts = normalized.split('\n\n');
  const remainder = flushRemainder ? '' : (rawParts.pop() ?? '');

  const events: ParsedSseEvent[] = [];
  for (const rawEvent of rawParts) {
    const trimmedEvent = rawEvent.trim();
    if (!trimmedEvent) continue;
    const dataLines = trimmedEvent
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) continue;
    try {
      const parsed = JSON.parse(dataLines.join('\n')) as ParsedSseEvent;
      if (parsed && typeof parsed === 'object') {
        events.push(parsed);
      }
    } catch {
      // Ignore malformed/keep-alive partial frames
    }
  }

  return { events, remainder };
}

export type AiModeType = 'general' | 'deep' | 'fast';

export interface ModelAttemptPlan {
  targetModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  thinkingLevelName?: 'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH' | 'MINIMAL';
  timeoutMs: number;
}

/**
 * Builds an ordered attempt plan per mode so slow or stalled primary model calls
 * automatically fail over to fast low-latency Gemini models before client watchdogs expire.
 */
export function buildModelAttemptPlan(
  mode?: AiModeType,
  options?: { skipHydrogen?: boolean }
): ModelAttemptPlan[] {
  const liteTimeoutMs = mode === 'deep' ? 20000 : 16000;

  if (mode === 'fast' || options?.skipHydrogen) {
    return [
      {
        targetModel: 'gemini-3.1-flash-lite',
        thinkingLevelName: 'MINIMAL',
        timeoutMs: liteTimeoutMs,
      },
    ];
  }

  if (mode === 'deep') {
    return [
      {
        targetModel: 'gemini-4-hydrogen',
        thinkingLevelName: 'XHIGH',
        timeoutMs: 4500,
      },
      {
        targetModel: 'gemini-3.1-flash-lite',
        thinkingLevelName: 'MINIMAL',
        timeoutMs: 20000,
      },
    ];
  }

  return [
    {
      targetModel: 'gemini-4-hydrogen',
      thinkingLevelName: 'LOW',
      timeoutMs: 3500,
    },
    {
      targetModel: 'gemini-3.1-flash-lite',
      thinkingLevelName: 'MINIMAL',
      timeoutMs: 16000,
    },
  ];
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'AI request'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

