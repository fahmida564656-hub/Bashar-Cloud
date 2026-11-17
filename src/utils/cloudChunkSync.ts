export const CLOUD_CHUNK_RAW_BYTES = 420 * 1024;
export const MAX_CLOUD_CHUNK_FILE_BYTES = 35 * 1024 * 1024;
export const INLINE_CLOUD_FILE_THRESHOLD_BYTES = 340 * 1024;

export interface CloudChunkRecord {
  index: number;
  data: string;
}

export function shouldChunkFileToCloud(sizeBytes: number): boolean {
  return (
    Number.isFinite(sizeBytes) &&
    sizeBytes > INLINE_CLOUD_FILE_THRESHOLD_BYTES &&
    sizeBytes <= MAX_CLOUD_CHUNK_FILE_BYTES
  );
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

  const ordered = [...chunks]
    .filter((c) => c && typeof c.data === 'string' && c.data.length > 0)
    .sort((a, b) => a.index - b.index);

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
