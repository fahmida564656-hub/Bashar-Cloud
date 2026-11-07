export const RECENT_SEARCHES_STORAGE_KEY = 'bashar_cloud_recent_searches';
export const MAX_RECENT_SEARCHES = 8;

/**
 * Pure function: add a term to a recent search list.
 * Deduplicates, brings the term to the front, and caps at maxCount.
 */
export function addTermToList(list: string[], term: string, maxCount = MAX_RECENT_SEARCHES): string[] {
  const trimmed = term.trim();
  if (!trimmed) return list;

  // Filter out any existing matching term (case-insensitive deduplication)
  const filtered = list.filter((item) => item.trim().toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...filtered].slice(0, maxCount);
}

/**
 * Pure function: remove a specific term from the list.
 */
export function removeTermFromList(list: string[], termToRemove: string): string[] {
  const target = termToRemove.trim().toLowerCase();
  return list.filter((item) => item.trim().toLowerCase() !== target);
}

/**
 * Safely load recent search terms from localStorage.
 */
export function loadRecentSearches(storageKey = RECENT_SEARCHES_STORAGE_KEY): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // ignore parse errors or access issues
  }
  return [];
}

/**
 * Safely persist recent search terms to localStorage.
 */
export function saveRecentSearches(terms: string[], storageKey = RECENT_SEARCHES_STORAGE_KEY): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(terms));
  } catch {
    // ignore write errors (quota exceeded or private mode)
  }
}
