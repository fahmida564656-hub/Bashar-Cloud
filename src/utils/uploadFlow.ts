import { FileType } from '../types';

export interface UploadQueueItem {
  id: string;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  type: FileType;
  fileObj?: File;
  status: 'preparing' | 'uploading' | 'done' | 'failed' | 'paused';
  progress: number; // 0 to 100
}

export interface UploadDestination {
  id: string | null; // null = root
  name: string;
}

/**
 * Formats bytes to human-readable size string (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Calculates total size of items and formats it
 */
export function calculateTotalSize(items: Array<{ sizeBytes: number }>): string {
  const total = items.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
  return formatBytes(total);
}

/**
 * Returns formatted file count string e.g. "49 files selected"
 */
export function formatSelectedCount(count: number): string {
  if (count === 1) return '1 file selected';
  return `${count} files selected`;
}

/**
 * Categorizes a file by extension and mime type
 */
export function resolveFileType(name: string, mimeType?: string): FileType {
  const lower = name.toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (
    lower.endsWith('.zip') ||
    lower.endsWith('.rar') ||
    lower.endsWith('.7z') ||
    lower.endsWith('.tar') ||
    lower.endsWith('.gz') ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('archive')
  ) {
    return 'archive';
  }

  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }

  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.avi') ||
    mime.startsWith('video/')
  ) {
    return 'video';
  }

  if (
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.ogg') ||
    mime.startsWith('audio/')
  ) {
    return 'audio';
  }

  return 'document';
}

/**
 * Converts File or mock to an UploadQueueItem
 */
export function createQueueItem(
  file: { name: string; size: number; type?: string },
  fileObj?: File,
  index = 0
): UploadQueueItem {
  const type = resolveFileType(file.name, file.type);
  return {
    id: `queue-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    sizeBytes: file.size,
    formattedSize: formatBytes(file.size),
    type,
    fileObj,
    status: 'preparing',
    progress: 0,
  };
}

/**
 * Calculates estimated remaining time
 */
export function estimateRemainingTime(doneCount: number, totalCount: number, elapsedSeconds: number): string {
  if (doneCount <= 0 || elapsedSeconds < 1) {
    return 'Calculating...';
  }
  const remainingFiles = totalCount - doneCount;
  if (remainingFiles <= 0) {
    return '0s';
  }
  const secPerFile = elapsedSeconds / doneCount;
  const remainingSec = Math.round(remainingFiles * secPerFile);

  if (remainingSec < 60) {
    return `${remainingSec}s`;
  }
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  return `${mins}m ${secs}s`;
}
