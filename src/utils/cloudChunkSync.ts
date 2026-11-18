export const CLOUD_CHUNK_RAW_BYTES = 640 * 1024;
export const MAX_CLOUD_CHUNK_FILE_BYTES = 100 * 1024 * 1024;
export const INLINE_CLOUD_FILE_THRESHOLD_BYTES = 340 * 1024;

export interface CloudChunkRecord {
  index: number;
  data: string;
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  // Video
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.3gp': 'video/3gpp',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
  // Audio
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  // Image
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  // Documents / Archives
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
};

/**
 * Infers a browser-playable MIME type from explicit MIME metadata or filename extension.
 * Prevents `<video>` / `<audio>` playback failures when browsers omit `File.type`.
 */
export function inferMediaMimeType(
  fileName?: string,
  explicitMimeType?: string
): string {
  const cleanedExplicit = (explicitMimeType || '').trim().toLowerCase();
  if (
    cleanedExplicit &&
    cleanedExplicit !== 'application/octet-stream' &&
    cleanedExplicit !== 'binary/octet-stream'
  ) {
    return cleanedExplicit;
  }

  const lowerName = (fileName || '').trim().toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  if (dotIdx >= 0) {
    const ext = lowerName.slice(dotIdx);
    if (EXTENSION_MIME_MAP[ext]) {
      return EXTENSION_MIME_MAP[ext];
    }
  }

  return cleanedExplicit || 'application/octet-stream';
}

export function shouldChunkFileToCloud(sizeBytes: number): boolean {
  return (
    Number.isFinite(sizeBytes) &&
    sizeBytes > INLINE_CLOUD_FILE_THRESHOLD_BYTES &&
    sizeBytes <= MAX_CLOUD_CHUNK_FILE_BYTES
  );
}

/**
 * Determines if a file still requires cloud chunk upload/verification.
 * Unlike trusting an optimistic chunk count, requires confirmed `cloudSynced === true`.
 */
export function needsCloudChunkUpload(file: {
  sizeBytes: number;
  cloudSynced?: boolean;
}): boolean {
  if (!shouldChunkFileToCloud(file.sizeBytes)) return false;
  return file.cloudSynced !== true;
}

export function estimateChunkCount(
  sizeBytes: number,
  chunkBytes: number = CLOUD_CHUNK_RAW_BYTES
): number {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / Math.max(1024, chunkBytes));
}

export function buildChunkDocId(fileId: string, index: number): string {
  return `${fileId}__chunk_${index}`;
}

export function getMissingChunkIndices(
  chunks: CloudChunkRecord[],
  expectedChunkCount: number
): number[] {
  if (!Number.isFinite(expectedChunkCount) || expectedChunkCount <= 0) return [];
  const present = new Set<number>();
  for (const c of chunks) {
    if (c && typeof c.index === 'number' && typeof c.data === 'string' && c.data.length > 0) {
      present.add(c.index);
    }
  }
  const missing: number[] = [];
  for (let i = 0; i < expectedChunkCount; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

export function areCloudChunksComplete(
  chunks: CloudChunkRecord[],
  expectedChunkCount?: number
): boolean {
  if (!Array.isArray(chunks) || chunks.length === 0) return false;
  if (!expectedChunkCount || expectedChunkCount <= 0) return true;
  return getMissingChunkIndices(chunks, expectedChunkCount).length === 0;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  }
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function splitBinaryIntoCloudChunks(
  bytes: Uint8Array,
  chunkBytes: number = CLOUD_CHUNK_RAW_BYTES
): string[] {
  if (!bytes || bytes.length === 0) return [];
  const step = Math.max(1024, chunkBytes);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += step) {
    const slice = bytes.subarray(offset, Math.min(bytes.length, offset + step));
    chunks.push(uint8ArrayToBase64(slice));
  }
  return chunks;
}

export function reassembleCloudChunksToUint8Array(chunks: CloudChunkRecord[]): Uint8Array {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return new Uint8Array(0);
  }

  // Deduplicate by index and sort ascending
  const byIndex = new Map<number, CloudChunkRecord>();
  for (const c of chunks) {
    if (c && typeof c.index === 'number' && typeof c.data === 'string' && c.data.length > 0) {
      byIndex.set(c.index, c);
    }
  }

  const ordered = Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
  if (ordered.length === 0) {
    return new Uint8Array(0);
  }

  const decodedParts = ordered.map((c) => base64ToUint8Array(c.data));
  const totalBytes = decodedParts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalBytes);

  let offset = 0;
  for (const part of decodedParts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

export function reassembleCloudChunksToBlob(
  chunks: CloudChunkRecord[],
  mimeType: string = 'application/octet-stream'
): Blob | null {
  const bytes = reassembleCloudChunksToUint8Array(chunks);
  if (bytes.length === 0) return null;
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: mimeType || 'application/octet-stream' });
}
