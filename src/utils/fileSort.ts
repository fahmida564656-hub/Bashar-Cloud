import { CloudFile } from '../types';

export type SortKey = 'name' | 'date' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  id: string;
  key: SortKey;
  order: SortOrder;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'date-desc', key: 'date', order: 'desc', label: 'Date (Newest)' },
  { id: 'date-asc', key: 'date', order: 'asc', label: 'Date (Oldest)' },
  { id: 'name-asc', key: 'name', order: 'asc', label: 'Name (A to Z)' },
  { id: 'name-desc', key: 'name', order: 'desc', label: 'Name (Z to A)' },
  { id: 'size-desc', key: 'size', order: 'desc', label: 'Size (Largest)' },
  { id: 'size-asc', key: 'size', order: 'asc', label: 'Size (Smallest)' },
];

/**
 * Safely parses a date string to a numeric timestamp.
 */
export function parseDateToTime(dateStr: string): number {
  if (!dateStr) return 0;
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Pure function to sort a list of CloudFiles by key and order.
 * Folders are always grouped at the top to match standard cloud drive conventions,
 * and sorted among themselves by the chosen criteria.
 */
export function sortFiles(
  files: CloudFile[],
  key: SortKey = 'date',
  order: SortOrder = 'desc',
  groupFoldersFirst: boolean = true
): CloudFile[] {
  return [...files].sort((a, b) => {
    // 1. Group folders first if enabled
    if (groupFoldersFirst) {
      const aIsFolder = a.type === 'folder';
      const bIsFolder = b.type === 'folder';
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
    }

    let comparison = 0;

    switch (key) {
      case 'name': {
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        break;
      }
      case 'size': {
        comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
        break;
      }
      case 'date':
      default: {
        const timeA = parseDateToTime(a.date);
        const timeB = parseDateToTime(b.date);
        comparison = timeA - timeB;
        break;
      }
    }

    return order === 'asc' ? comparison : -comparison;
  });
}
