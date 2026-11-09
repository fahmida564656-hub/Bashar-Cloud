export type ViewMode = 'grid' | 'list';

/**
 * Toggles between 'grid' and 'list' view mode
 */
export function toggleViewMode(current: ViewMode): ViewMode {
  return current === 'grid' ? 'list' : 'grid';
}

/**
 * Checks if current view mode is grid
 */
export function isGridMode(mode: ViewMode): boolean {
  return mode === 'grid';
}

/**
 * Returns layout classes optimized for image files in grid vs list view
 */
export function getImageVisibilityClasses(mode: ViewMode) {
  if (mode === 'grid') {
    return {
      container: 'w-full h-32 rounded-xl overflow-hidden bg-[#09111f] mb-2.5 relative flex items-center justify-center border border-[#1b2a42]',
      image: 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105',
      badge: 'absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-[9px] text-white font-medium px-1.5 py-0.5 rounded shadow',
    };
  }
  return {
    container: 'w-10 h-10 rounded-xl overflow-hidden bg-[#09111f] shrink-0 relative flex items-center justify-center border border-[#1b2a42]',
    image: 'w-full h-full object-cover',
    badge: 'hidden',
  };
}

/**
 * Validates and normalizes view mode preference
 */
export function normalizeViewMode(val: unknown, fallback: ViewMode = 'grid'): ViewMode {
  if (val === 'grid' || val === 'list') return val;
  return fallback;
}
