import JSZip from 'jszip';
import { ArchiveEntry, CloudFile, FileType, StorageUsage } from '../types';
import { createInitialVersion } from './fileVersioning';
import { resolveFileType, formatBytes } from './uploadFlow';
import { estimateChunkCount, shouldChunkFileToCloud } from './cloudChunkSync';

const DB_NAME = 'BasharCloudVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

const MAX_INLINE_DATA_URL_CHARS = 480_000;
const MAX_INLINE_TEXT_CHARS = 250_000;
const MAX_THUMBNAIL_CHARS = 140_000;
const MAX_VERSIONS_PER_FILE = 50;
export const MAX_FIRESTORE_DOC_BYTES = 880_000;
export const MAX_FIRESTORE_MEDIA_URL_CHARS = 180_000;

export function estimateUtf8ByteSize(value: unknown): number {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).length;
  }
  return serialized.length * 2;
}

/**
 * Ensures an avatar/logo URL fits safely well inside Firestore's 1 MiB document limit.
 * Rejects transient blob URLs and oversized Base64 data URLs while preserving normal URLs and compact images.
 */
export function sanitizeFirestoreMediaUrl(
  url?: string,
  maxChars: number = MAX_FIRESTORE_MEDIA_URL_CHARS
): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('blob:')) return '';
  if (trimmed.startsWith('data:')) {
    return trimmed.length <= maxChars ? trimmed : '';
  }
  return trimmed.length <= 4096 ? trimmed : '';
}

/**
 * Guarantees a Firestore file/recycle-bin document payload stays safely below Firestore's 1 MiB limit.
 * Progressively sheds bulky inline blobs/previews (which are already persisted in IndexedDB) if needed.
 */
export function fitFilePayloadToFirestoreLimit<T extends Record<string, unknown>>(
  payload: T,
  maxBytes: number = MAX_FIRESTORE_DOC_BYTES
): T {
  const clone: Record<string, unknown> = { ...payload };
  if (estimateUtf8ByteSize(clone) <= maxBytes) return clone as T;

  if (typeof clone.url === 'string' && clone.url.startsWith('data:')) {
    clone.url = '';
  }
  if (estimateUtf8ByteSize(clone) <= maxBytes) return clone as T;

  if (typeof clone.thumbnail === 'string' && clone.thumbnail.startsWith('data:') && clone.thumbnail.length > 60_000) {
    clone.thumbnail = '';
  }
  if (estimateUtf8ByteSize(clone) <= maxBytes) return clone as T;

  if (typeof clone.content === 'string' && clone.content.length > 40_000) {
    clone.content = clone.content.slice(0, 40_000);
  }
  if (estimateUtf8ByteSize(clone) <= maxBytes) return clone as T;

  if (Array.isArray(clone.archiveEntries) && clone.archiveEntries.length > 40) {
    clone.archiveEntries = clone.archiveEntries.slice(0, 40);
  }
  if (Array.isArray(clone.versions) && clone.versions.length > 20) {
    clone.versions = clone.versions.slice(0, 20);
  }
  if (estimateUtf8ByteSize(clone) <= maxBytes) return clone as T;

  clone.content = '';
  clone.thumbnail = '';
  return clone as T;
}

/**
 * Checks whether a URL can be safely persisted across page reloads & devices.
 * Transient `blob:` URLs expire when a document is closed and must never be persisted.
 */
export function isPersistableUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('blob:')) return false;
  return (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/')
  );
}

/**
 * Determines whether a file is text-based so its readable content can be extracted & backed up.
 */
export function isTextDocumentName(name: string, mimeType?: string): boolean {
  const lower = (name || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') {
    return true;
  }
  return (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.html') ||
    lower.endsWith('.htm') ||
    lower.endsWith('.css') ||
    lower.endsWith('.js') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.log') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.sql')
  );
}

/**
 * Returns a clean, size-bounded CloudFile copy safe for Firestore and localStorage persistence.
 * Strips ephemeral `blob:` URLs while keeping Data URLs, thumbnails, text content, archive entries, and versions.
 */
export function sanitizeFileForPersistence(
  file: CloudFile,
  options: { stripLargeDataUrl?: boolean } = {}
): CloudFile {
  const safeUrl =
    file.url && isPersistableUrl(file.url)
      ? options.stripLargeDataUrl && file.url.startsWith('data:') && file.url.length > 2048
        ? undefined
        : file.url.length <= MAX_INLINE_DATA_URL_CHARS
          ? file.url
          : undefined
      : undefined;

  const safeThumbnail =
    file.thumbnail && isPersistableUrl(file.thumbnail)
      ? options.stripLargeDataUrl && file.thumbnail.startsWith('data:') && file.thumbnail.length > 2048
        ? undefined
        : file.thumbnail.length <= MAX_THUMBNAIL_CHARS
          ? file.thumbnail
          : undefined
      : undefined;

  const safeContent =
    typeof file.content === 'string' && file.content.length > 0
      ? file.content.slice(0, MAX_INLINE_TEXT_CHARS)
      : undefined;

  const safeVersions =
    Array.isArray(file.versions) && file.versions.length > 0
      ? file.versions.slice(0, MAX_VERSIONS_PER_FILE)
      : undefined;

  const sanitized: CloudFile = {
    id: file.id,
    name: file.name,
    type: file.type,
    sizeBytes: Number(file.sizeBytes) || 0,
    formattedSize: file.formattedSize || formatBytes(Number(file.sizeBytes) || 0),
    date: file.date,
    isFavorite: Boolean(file.isFavorite),
    parentFolderId: file.parentFolderId ?? null,
    ...(safeUrl ? { url: safeUrl } : {}),
    ...(safeThumbnail ? { thumbnail: safeThumbnail } : {}),
    ...(file.itemCount !== undefined ? { itemCount: file.itemCount } : {}),
    ...(safeContent !== undefined ? { content: safeContent } : {}),
    ...(file.extension ? { extension: file.extension } : {}),
    ...(Array.isArray(file.archiveEntries) && file.archiveEntries.length > 0
      ? { archiveEntries: file.archiveEntries.slice(0, 200) }
      : {}),
    ...(file.ownerId ? { ownerId: file.ownerId } : {}),
    ...(safeVersions ? { versions: safeVersions } : {}),
    ...(file.mimeType ? { mimeType: file.mimeType } : {}),
    ...(typeof file.cloudChunkCount === 'number' && file.cloudChunkCount > 0
      ? { cloudChunkCount: file.cloudChunkCount }
      : {}),
  };

  return sanitized;
}

const DELETED_IDS_PREFIX = 'bashar_cloud_deleted_ids_v1';

/**
 * Recursively removes `undefined` keys from plain objects and arrays so Firestore `setDoc` never rejects payloads.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        clean[key] = stripUndefinedDeep(val);
      }
    }
    return clean as T;
  }
  return value;
}

export function loadDeletedFileIds(userId?: string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const key = userId && userId !== 'guest_user' ? `${DELETED_IDS_PREFIX}_${userId}` : DELETED_IDS_PREFIX;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function addDeletedFileIds(userId: string | undefined, ids: string[]): void {
  if (typeof localStorage === 'undefined' || !ids || ids.length === 0) return;
  try {
    const key = userId && userId !== 'guest_user' ? `${DELETED_IDS_PREFIX}_${userId}` : DELETED_IDS_PREFIX;
    const existing = loadDeletedFileIds(userId);
    ids.forEach((id) => {
      if (id) existing.add(id);
    });
    const list = Array.from(existing).slice(-500);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function removeDeletedFileIds(userId: string | undefined, ids: string[]): void {
  if (typeof localStorage === 'undefined' || !ids || ids.length === 0) return;
  try {
    const key = userId && userId !== 'guest_user' ? `${DELETED_IDS_PREFIX}_${userId}` : DELETED_IDS_PREFIX;
    const existing = loadDeletedFileIds(userId);
    let changed = false;
    ids.forEach((id) => {
      if (existing.delete(id)) changed = true;
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(Array.from(existing)));
    }
  } catch {}
}

export function clearDeletedFileIds(userId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = userId && userId !== 'guest_user' ? `${DELETED_IDS_PREFIX}_${userId}` : DELETED_IDS_PREFIX;
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Merges incoming cloud files with existing hydrated local files cleanly:
 * - Preserves live blob URLs, locally cached previews, contents, archive entries, and richer version lists
 * - Retains local-only files not yet echoed back by a Firestore snapshot (lifetime guarantee unless explicitly deleted)
 * - Excludes any ID present in `deletedIds` so explicitly deleted files stay deleted
 */
export function mergeCloudAndLocalFiles(
  cloudFiles: CloudFile[],
  localFiles: CloudFile[],
  deletedIds?: Set<string>
): CloudFile[] {
  const localById = new Map<string, CloudFile>();
  for (const lf of localFiles) {
    if (deletedIds?.has(lf.id)) continue;
    localById.set(lf.id, lf);
  }

  const seenIds = new Set<string>();
  const mergedCloud: CloudFile[] = [];

  for (const cf of cloudFiles) {
    if (deletedIds?.has(cf.id)) continue;
    seenIds.add(cf.id);
    const local = localById.get(cf.id);
    if (!local) {
      mergedCloud.push(cf);
      continue;
    }

    const resolvedUrl =
      cf.url && cf.url.trim()
        ? cf.url
        : local.url && local.url.trim()
          ? local.url
          : undefined;

    const resolvedThumbnail =
      cf.thumbnail && cf.thumbnail.trim()
        ? cf.thumbnail
        : local.thumbnail && local.thumbnail.trim()
          ? local.thumbnail
          : undefined;

    const resolvedContent =
      cf.content !== undefined && cf.content !== ''
        ? cf.content
        : local.content;

    const resolvedArchiveEntries =
      cf.archiveEntries && cf.archiveEntries.length > 0
        ? cf.archiveEntries
        : local.archiveEntries;

    const resolvedVersions =
      (cf.versions?.length || 0) >= (local.versions?.length || 0)
        ? cf.versions && cf.versions.length > 0
          ? cf.versions
          : local.versions
        : local.versions;

    const resolvedMimeType = cf.mimeType || local.mimeType;
    const resolvedChunkCount = Math.max(cf.cloudChunkCount || 0, local.cloudChunkCount || 0);

    mergedCloud.push({
      ...cf,
      ...(resolvedUrl ? { url: resolvedUrl } : {}),
      ...(resolvedThumbnail ? { thumbnail: resolvedThumbnail } : {}),
      ...(resolvedContent !== undefined ? { content: resolvedContent } : {}),
      ...(resolvedArchiveEntries ? { archiveEntries: resolvedArchiveEntries } : {}),
      ...(resolvedVersions ? { versions: resolvedVersions } : {}),
      ...(resolvedMimeType ? { mimeType: resolvedMimeType } : {}),
      ...(resolvedChunkCount > 0 ? { cloudChunkCount: resolvedChunkCount } : {}),
    });
  }

  const localOnly: CloudFile[] = [];
  for (const lf of localFiles) {
    if (deletedIds?.has(lf.id) || seenIds.has(lf.id)) continue;
    seenIds.add(lf.id);
    localOnly.push(lf);
  }

  return [...localOnly, ...mergedCloud];
}

/**
 * Computes accurate StorageUsage across all real user files (including archives).
 */
export function computeStorageBreakdown(files: CloudFile[], totalGB = 1000): StorageUsage {
  let imagesBytes = 0;
  let imagesCount = 0;
  let videosBytes = 0;
  let videosCount = 0;
  let audiosBytes = 0;
  let audiosCount = 0;
  let docsBytes = 0;
  let docsCount = 0;
  let archivesBytes = 0;

  for (const file of files) {
    const bytes = Number(file.sizeBytes) || 0;
    if (file.type === 'image') {
      imagesBytes += bytes;
      imagesCount++;
    } else if (file.type === 'video') {
      videosBytes += bytes;
      videosCount++;
    } else if (file.type === 'audio') {
      audiosBytes += bytes;
      audiosCount++;
    } else if (file.type === 'document') {
      docsBytes += bytes;
      docsCount++;
    } else if (file.type === 'archive') {
      archivesBytes += bytes;
      docsCount++;
    }
  }

  const totalBytes = imagesBytes + videosBytes + audiosBytes + docsBytes + archivesBytes;
  const usedGB =
    totalBytes === 0 ? 0 : Number((totalBytes / (1024 * 1024 * 1024)).toFixed(4));

  return {
    totalGB: totalGB || 1000,
    usedGB,
    imagesGB: imagesBytes === 0 ? 0 : Number((imagesBytes / (1024 * 1024 * 1024)).toFixed(3)),
    imagesCount,
    videosGB: videosBytes === 0 ? 0 : Number((videosBytes / (1024 * 1024 * 1024)).toFixed(3)),
    videosCount,
    audiosMB: audiosBytes === 0 ? 0 : Math.max(audiosCount > 0 ? 1 : 0, Math.round(audiosBytes / (1024 * 1024))),
    audiosCount,
    docsMB:
      docsBytes + archivesBytes === 0
        ? 0
        : Math.max(docsCount > 0 ? 1 : 0, Math.round((docsBytes + archivesBytes) / (1024 * 1024))),
    docsCount,
  };
}

/**
 * Formats total bytes used concisely for UI cards (e.g. "0 B", "14 KB", "2.4 MB", "1.20 GB").
 */
export function formatTotalBytesUsed(totalBytes: number): string {
  if (!totalBytes || totalBytes <= 0) return '0 B';
  if (totalBytes >= 1024 * 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return formatBytes(totalBytes);
}

// ==========================================
// BROWSER INDEXEDDB BLOB VAULT
// ==========================================

let cachedVaultDbPromise: Promise<IDBDatabase | null> | null = null;

function openVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (cachedVaultDbPromise) {
    return cachedVaultDbPromise;
  }
  cachedVaultDbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          cachedVaultDbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          cachedVaultDbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        cachedVaultDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedVaultDbPromise = null;
      resolve(null);
    }
  });
  return cachedVaultDbPromise;
}

export async function saveFileBlob(fileId: string, blob: Blob): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      cachedVaultDbPromise = null;
      resolve();
    }
  });
}

export async function getFileBlob(fileId: string): Promise<Blob | null> {
  const db = await openVaultDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileId);
      req.onsuccess = () => {
        resolve(req.result instanceof Blob ? req.result : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      cachedVaultDbPromise = null;
      resolve(null);
    }
  });
}

export async function deleteFileBlob(fileId: string): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      cachedVaultDbPromise = null;
      resolve();
    }
  });
}

export async function clearAllFileBlobs(): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      cachedVaultDbPromise = null;
      resolve();
    }
  });
}

export async function copyFileBlob(sourceFileId: string, targetFileId: string): Promise<void> {
  const existing = await getFileBlob(sourceFileId);
  if (existing) {
    await saveFileBlob(targetFileId, existing);
  }
}

function readBlobAsDataURL(blob: Blob): Promise<string | undefined> {
  if (typeof FileReader === 'undefined') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    } catch {
      resolve(undefined);
    }
  });
}

async function createImageThumbnailDataURL(blob: Blob): Promise<string | undefined> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return new Promise((resolve) => {
    try {
      const imgUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 480;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
          canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(imgUrl);
            resolve(undefined);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          URL.revokeObjectURL(imgUrl);
          resolve(dataUrl.length <= MAX_THUMBNAIL_CHARS ? dataUrl : undefined);
        } catch {
          URL.revokeObjectURL(imgUrl);
          resolve(undefined);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(imgUrl);
        resolve(undefined);
      };
      img.src = imgUrl;
    } catch {
      resolve(undefined);
    }
  });
}

async function createVideoThumbnailDataURL(blob: Blob): Promise<string | undefined> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return new Promise((resolve) => {
    let settled = false;
    let videoUrl: string | null = null;
    const finish = (val?: string) => {
      if (settled) return;
      settled = true;
      if (videoUrl) {
        try {
          URL.revokeObjectURL(videoUrl);
        } catch {}
      }
      resolve(val);
    };

    const timer = window.setTimeout(() => finish(undefined), 1800);

    try {
      videoUrl = URL.createObjectURL(blob);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const captureFrame = () => {
        try {
          const vw = video.videoWidth || 320;
          const vh = video.videoHeight || 180;
          const maxDim = 420;
          const scale = Math.min(1, maxDim / Math.max(vw, vh));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(vw * scale));
          canvas.height = Math.max(1, Math.round(vh * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            window.clearTimeout(timer);
            finish(undefined);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          window.clearTimeout(timer);
          finish(dataUrl.length <= MAX_THUMBNAIL_CHARS ? dataUrl : undefined);
        } catch {
          window.clearTimeout(timer);
          finish(undefined);
        }
      };

      video.onloadeddata = () => {
        try {
          if (video.duration && Number.isFinite(video.duration) && video.duration > 0.4) {
            video.currentTime = Math.min(0.3, video.duration / 3);
          } else {
            captureFrame();
          }
        } catch {
          captureFrame();
        }
      };
      video.onseeked = captureFrame;
      video.onerror = () => {
        window.clearTimeout(timer);
        finish(undefined);
      };
      video.src = videoUrl;
    } catch {
      window.clearTimeout(timer);
      finish(undefined);
    }
  });
}

/**
 * Compresses an uploaded image Blob or oversized Data URL into a crisp, Firestore-safe Data URL.
 * Scales dimensions down to maxDim (default 320px for avatars/logos) and steps down quality until <= maxChars.
 */
export async function compressImageToSafeDataUrl(
  input: Blob | string,
  options: { maxDim?: number; maxChars?: number; fallbackToRaw?: boolean } = {}
): Promise<string | undefined> {
  const { maxDim = 320, maxChars = 150_000, fallbackToRaw = false } = options;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    if (!trimmed.startsWith('data:')) return trimmed;
    if (trimmed.length <= maxChars) return trimmed;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return typeof input === 'string' && input.length <= maxChars ? input : undefined;
  }

  return new Promise((resolve) => {
    let revokeSrc: string | null = null;
    try {
      const src =
        typeof input === 'string'
          ? input
          : (() => {
              const objUrl = URL.createObjectURL(input);
              revokeSrc = objUrl;
              return objUrl;
            })();

      const img = new Image();
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || maxDim;
          const naturalH = img.naturalHeight || img.height || maxDim;
          const dimSteps = [maxDim, Math.min(maxDim, 224), Math.min(maxDim, 160), 112];
          const qualitySteps = [0.8, 0.65, 0.5, 0.35];

          for (const dim of dimSteps) {
            const scale = Math.min(1, dim / Math.max(1, naturalW, naturalH));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(naturalW * scale));
            canvas.height = Math.max(1, Math.round(naturalH * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            for (const q of qualitySteps) {
              const candidate = canvas.toDataURL('image/jpeg', q);
              if (candidate.length <= maxChars) {
                if (revokeSrc) URL.revokeObjectURL(revokeSrc);
                resolve(candidate);
                return;
              }
            }
          }

          if (revokeSrc) URL.revokeObjectURL(revokeSrc);
          resolve(undefined);
        } catch {
          if (revokeSrc) URL.revokeObjectURL(revokeSrc);
          resolve(undefined);
        }
      };
      img.onerror = async () => {
        if (revokeSrc) URL.revokeObjectURL(revokeSrc);
        if (fallbackToRaw && input instanceof Blob) {
          const raw = await readBlobAsDataURL(input);
          resolve(raw && raw.length <= maxChars ? raw : undefined);
        } else {
          resolve(undefined);
        }
      };
      img.src = src;
    } catch {
      if (revokeSrc) URL.revokeObjectURL(revokeSrc);
      resolve(undefined);
    }
  });
}

async function extractZipEntriesFromBlob(blob: Blob): Promise<ArchiveEntry[]> {
  try {
    const zip = await JSZip.loadAsync(blob);
    const entries: ArchiveEntry[] = [];
    zip.forEach((relativePath, entry) => {
      const rawSize = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0;
      entries.push({
        name: relativePath,
        size: entry.dir ? 'Folder' : formatBytes(rawSize),
        sizeBytes: rawSize,
        isDir: entry.dir,
      });
    });
    return entries;
  } catch {
    return [];
  }
}

/**
 * Converts a browser `File` (or raw `Blob` + name) into a permanent, loss-proof `CloudFile`:
 * - Stores full binary in IndexedDB (`BasharCloudVaultDB`)
 * - Stores persistent Data URL (for files <= 340 KB) or compressed JPEG thumbnail for Firestore cross-device sync
 * - Extracts readable text content & ZIP archive entries
 * - Returns an active object URL for instant rendering
 */
export async function buildCloudFileFromBrowserFile(
  file: File,
  options: {
    id: string;
    parentFolderId?: string | null;
    uploaderName?: string;
    typeOverride?: FileType;
  }
): Promise<CloudFile> {
  const { id, parentFolderId = null, uploaderName, typeOverride } = options;
  const resolvedType = typeOverride || resolveFileType(file.name, file.type);
  const formattedSize = formatBytes(file.size);
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let liveUrl: string | undefined;
  try {
    liveUrl = URL.createObjectURL(file);
  } catch {}

  const shouldInlineDataUrl = file.size > 0 && file.size <= 340 * 1024;
  const shouldBuildThumb = resolvedType === 'image' && !shouldInlineDataUrl;
  const shouldBuildVideoThumb = resolvedType === 'video';
  const shouldReadText =
    resolvedType === 'document' && isTextDocumentName(file.name, file.type) && file.size <= 250 * 1024;
  const shouldExtractZip = resolvedType === 'archive' && file.name.toLowerCase().endsWith('.zip');
  const plannedChunkCount = shouldChunkFileToCloud(file.size) ? estimateChunkCount(file.size) : 0;

  // Run IndexedDB blob write, optional inline DataURL, thumbnail resize, text extraction, and ZIP scan in parallel
  const [, rawDataUrl, imgThumbnail, videoThumbnail, content, parsedZipEntries] = await Promise.all([
    saveFileBlob(id, file),
    shouldInlineDataUrl ? readBlobAsDataURL(file) : Promise.resolve(undefined),
    shouldBuildThumb ? createImageThumbnailDataURL(file) : Promise.resolve(undefined),
    shouldBuildVideoThumb ? createVideoThumbnailDataURL(file) : Promise.resolve(undefined),
    shouldReadText ? file.text().catch(() => undefined) : Promise.resolve(undefined),
    shouldExtractZip ? extractZipEntriesFromBlob(file) : Promise.resolve([] as ArchiveEntry[]),
  ]);

  const thumbnail = imgThumbnail || videoThumbnail;
  const persistentUrl =
    rawDataUrl && rawDataUrl.length <= MAX_INLINE_DATA_URL_CHARS ? rawDataUrl : undefined;

  let archiveEntries: ArchiveEntry[] | undefined;
  let itemCount: number | undefined;
  if (parsedZipEntries.length > 0) {
    archiveEntries = parsedZipEntries;
    itemCount = parsedZipEntries.filter((e) => !e.isDir).length || parsedZipEntries.length;
  }

  const extParts = file.name.split('.');
  const extension = extParts.length > 1 ? `.${extParts.pop()?.toLowerCase()}` : '';

  return {
    id,
    name: file.name,
    type: resolvedType,
    sizeBytes: file.size,
    formattedSize,
    date: dateStr,
    isFavorite: false,
    parentFolderId,
    url: persistentUrl || liveUrl || (resolvedType === 'image' ? thumbnail : undefined),
    ...(thumbnail ? { thumbnail } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(extension ? { extension } : {}),
    ...(file.type ? { mimeType: file.type } : {}),
    ...(plannedChunkCount > 0 ? { cloudChunkCount: plannedChunkCount } : {}),
    ...(archiveEntries ? { archiveEntries } : {}),
    ...(itemCount !== undefined ? { itemCount } : {}),
    versions: [
      createInitialVersion(
        { id, name: file.name, sizeBytes: file.size, formattedSize, date: dateStr },
        uploaderName
      ),
    ],
  };
}

/**
 * Hydrates an array of CloudFiles on app boot / cloud sync:
 * If a file has a missing URL or stale `blob:` URL, restores a fresh live ObjectURL
 * from the persistent IndexedDB Blob Vault (falling back to `thumbnail` or `data:` URL).
 */
export async function hydrateCloudFiles(files: CloudFile[]): Promise<CloudFile[]> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return files;
  }

  const hydrated = await Promise.all(
    files.map(async (f) => {
      if (f.type === 'folder') return f;
      const hasValidPersistentUrl = f.url && isPersistableUrl(f.url);
      if (hasValidPersistentUrl && !f.url!.startsWith('blob:')) {
        return f;
      }

      const blob = await getFileBlob(f.id);
      if (blob) {
        try {
          const freshUrl = URL.createObjectURL(blob);
          return { ...f, url: freshUrl };
        } catch {}
      }

      if (f.type === 'image' && f.thumbnail && isPersistableUrl(f.thumbnail)) {
        return { ...f, url: f.thumbnail };
      }

      if (f.url && f.url.startsWith('blob:')) {
        const cleanCopy = { ...f };
        delete cleanCopy.url;
        return cleanCopy;
      }

      return f;
    })
  );

  return hydrated;
}
