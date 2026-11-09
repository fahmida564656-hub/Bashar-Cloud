export type AppTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'bashar_cloud_theme';

/**
 * Retrieves the saved theme preference from localStorage, defaulting to 'dark'.
 */
export function getSavedTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {}
  return 'dark';
}

/**
 * Toggles between 'dark' and 'light' themes.
 */
export function toggleTheme(current: AppTheme): AppTheme {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Validates and normalizes any value to a valid AppTheme.
 */
export function normalizeTheme(val: unknown, fallback: AppTheme = 'dark'): AppTheme {
  if (val === 'light' || val === 'dark') return val;
  return fallback;
}

/**
 * Applies the theme to the document HTML element and saves to localStorage.
 */
export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}
