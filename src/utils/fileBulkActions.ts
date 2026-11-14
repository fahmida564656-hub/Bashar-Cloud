import { CloudFile, FileType } from '../types';
import { formatTotalBytesUsed } from './fileVault';

export interface FileCardAccent {
  topBarGradient: string;
  badgeClass: string;
  borderTintClass: string;
  glowClass: string;
  shortTag: string;
}

export interface SelectionSummary {
  selectedFiles: CloudFile[];
  count: number;
  totalBytes: number;
  formattedTotalSize: string;
  allFavorites: boolean;
  canRename: boolean;
}

export function getFileAccentTheme(type: FileType): FileCardAccent {
  switch (type) {
    case 'image':
      return {
        topBarGradient: 'from-sky-400 via-blue-500 to-indigo-500',
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
        borderTintClass: 'hover:border-blue-400/50',
        glowClass: 'from-blue-500/10 to-transparent',
        shortTag: 'IMG',
      };
    case 'video':
      return {
        topBarGradient: 'from-fuchsia-400 via-purple-500 to-indigo-500',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
        borderTintClass: 'hover:border-purple-400/50',
        glowClass: 'from-purple-500/10 to-transparent',
        shortTag: 'VID',
      };
    case 'audio':
      return {
        topBarGradient: 'from-amber-300 via-amber-500 to-orange-500',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
        borderTintClass: 'hover:border-amber-400/50',
        glowClass: 'from-amber-500/10 to-transparent',
        shortTag: 'AUD',
      };
    case 'archive':
      return {
        topBarGradient: 'from-orange-400 via-amber-500 to-yellow-500',
        badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
        borderTintClass: 'hover:border-orange-400/50',
        glowClass: 'from-orange-500/10 to-transparent',
        shortTag: 'ZIP',
      };
    case 'folder':
      return {
        topBarGradient: 'from-cyan-400 via-sky-500 to-blue-600',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
        borderTintClass: 'hover:border-sky-400/50',
        glowClass: 'from-sky-500/10 to-transparent',
        shortTag: 'DIR',
      };
    default:
      return {
        topBarGradient: 'from-emerald-400 via-teal-500 to-cyan-500',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
        borderTintClass: 'hover:border-emerald-400/50',
        glowClass: 'from-emerald-500/10 to-transparent',
        shortTag: 'DOC',
      };
  }
}

export function summarizeSelectedFiles(
  files: CloudFile[],
  selectedIds: Set<string>
): SelectionSummary {
  const selectedFiles = files.filter((f) => selectedIds.has(f.id));
  const count = selectedFiles.length;
  const totalBytes = selectedFiles.reduce(
    (sum, file) => sum + (Number(file.sizeBytes) || 0),
    0
  );
  const allFavorites = count > 0 && selectedFiles.every((f) => Boolean(f.isFavorite));

  return {
    selectedFiles,
    count,
    totalBytes,
    formattedTotalSize: totalBytes > 0 ? formatTotalBytesUsed(totalBytes) : '0 B',
    allFavorites,
    canRename: count === 1,
  };
}

export function buildBulkShareText(
  selectedFiles: CloudFile[],
  appName = 'Bashar Cloud'
): string {
  if (selectedFiles.length === 0) return '';
  const totalBytes = selectedFiles.reduce((sum, f) => sum + (Number(f.sizeBytes) || 0), 0);
  const totalLabel = totalBytes > 0 ? formatTotalBytesUsed(totalBytes) : '0 B';
  const lines = [
    `${appName} — Shared ${selectedFiles.length} item${selectedFiles.length === 1 ? '' : 's'} (${totalLabel})`,
    ...selectedFiles.map((file, idx) => {
      const publicUrl =
        file.url && /^https?:\/\//i.test(file.url) ? ` — ${file.url}` : '';
      return `${idx + 1}. ${file.name} (${file.formattedSize}, ${file.type})${publicUrl}`;
    }),
  ];
  return lines.join('\n');
}
