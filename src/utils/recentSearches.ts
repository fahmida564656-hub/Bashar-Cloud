export const RECENT_SEARCHES_STORAGE_KEY = 'bashar_cloud_recent_searches';
export const MAX_RECENT_SEARCHES = 8;

/**
 * Resolve a per-user localStorage key so recent search history stays isolated per account.
 */
export function getRecentSearchesStorageKey(userId?: string): string {
  const cleanId = (userId || '').trim();
  if (!cleanId || cleanId === 'guest_user') {
    return RECENT_SEARCHES_STORAGE_KEY;
  }
  return `${RECENT_SEARCHES_STORAGE_KEY}_${cleanId}`;
}

/**
 * Normalize whitespace in a search term before deduplicating/storing.
 */
export function normalizeSearchTerm(term: string): string {
  return term.replace(/\s+/g, ' ').trim();
}

/**
 * Pure function: add a term to a recent search list.
 * Deduplicates, brings the term to the front, and caps at maxCount.
 */
export function addTermToList(list: string[], term: string, maxCount = MAX_RECENT_SEARCHES): string[] {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return list;

  // Filter out any existing matching term (case-insensitive deduplication)
  const filtered = list.filter(
    (item) => normalizeSearchTerm(item).toLowerCase() !== normalized.toLowerCase()
  );
  return [normalized, ...filtered].slice(0, maxCount);
}

/**
 * Pure function: remove a specific term from the list.
 */
export function removeTermFromList(list: string[], termToRemove: string): string[] {
  const target = normalizeSearchTerm(termToRemove).toLowerCase();
  return list.filter((item) => normalizeSearchTerm(item).toLowerCase() !== target);
}

/**
 * Filter recent search terms matching an active partial query for quick re-access.
 */
export function filterMatchingRecentTerms(list: string[], query: string): string[] {
  const normalizedQuery = normalizeSearchTerm(query).toLowerCase();
  if (!normalizedQuery) return list;
  return list.filter((item) => {
    const lowerItem = normalizeSearchTerm(item).toLowerCase();
    return lowerItem.includes(normalizedQuery) && lowerItem !== normalizedQuery;
  });
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
      return parsed
        .filter((item): item is string => typeof item === 'string' && normalizeSearchTerm(item).length > 0)
        .slice(0, MAX_RECENT_SEARCHES);
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
    window.localStorage.setItem(storageKey, JSON.stringify(terms.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // ignore write errors (quota exceeded or private mode)
  }
}

/**
 * Safely clear recent search terms from localStorage.
 */
export function clearRecentSearches(storageKey = RECENT_SEARCHES_STORAGE_KEY): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore removal errors
  }
}
