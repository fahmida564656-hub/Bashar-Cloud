export type OrbitThemePresetId = '1' | '2' | '3' | '4' | '5';

export interface OrbitThemePreset {
  id: OrbitThemePresetId;
  numberLabel: string;
  name: string;
  bnName: string;
  subtitle: string;
  badge?: string;
  previewGradient: string;
  dotColor: string;
}

export const ORBIT_THEME_STORAGE_KEY = 'bashar_cloud_orbit_theme';

export const ORBIT_THEME_PRESETS: OrbitThemePreset[] = [
  {
    id: '1',
    numberLabel: '1',
    name: 'Aurora Prism',
    bnName: 'অরোরা প্রিজম',
    subtitle: 'ক্লাসিক মাল্টি-কালার স্পেকট্রাম',
    previewGradient:
      'conic-gradient(from 40deg, #3b82f6, #06b6d4, #10b981, #eab308, #ef4444, #6366f1, #3b82f6)',
    dotColor: '#38bdf8',
  },
  {
    id: '2',
    numberLabel: '2',
    name: 'Sapphire Cyber',
    bnName: 'স্যাফায়ার সাইবার',
    subtitle: 'রয়্যাল ব্লু ও ক্রিস্টাল সায়ান',
    previewGradient:
      'conic-gradient(from 40deg, #1d4ed8, #0284c7, #00e5ff, #bae6fd, #38bdf8, #2563eb, #1d4ed8)',
    dotColor: '#00d2ff',
  },
  {
    id: '3',
    numberLabel: '3',
    name: 'Emerald Quantum',
    bnName: 'এমেরাল্ড কোয়ান্টাম',
    subtitle: 'টিল, জেড ও প্রিমিয়াম মিন্ট',
    previewGradient:
      'conic-gradient(from 40deg, #059669, #10b981, #14b8a6, #6ee7b7, #2dd4bf, #047857, #059669)',
    dotColor: '#10b981',
  },
  {
    id: '4',
    numberLabel: '4',
    name: 'Executive Luxe',
    bnName: 'এক্সিকিউটিভ প্রো',
    subtitle: 'শ্যাম্পেন গোল্ড, প্লাটিনাম ও স্যাফায়ার',
    badge: 'Pro',
    previewGradient:
      'conic-gradient(from 40deg, #e7c16a, #f8fafc, #94a3b8, #3b82f6, #d4a34b, #cbd5e1, #e7c16a)',
    dotColor: '#e7c16a',
  },
  {
    id: '5',
    numberLabel: '5',
    name: 'Royal Amethyst',
    bnName: 'রয়্যাল অ্যামেথিস্ট',
    subtitle: 'ইন্ডিগো, ভায়োলেট ও রোজ গোল্ড',
    previewGradient:
      'conic-gradient(from 40deg, #6366f1, #a855f7, #ec4899, #f59e0b, #8b5cf6, #4f46e5, #6366f1)',
    dotColor: '#a855f7',
  },
];

export function normalizeOrbitThemePreset(
  value: unknown,
  fallback: OrbitThemePresetId = '1'
): OrbitThemePresetId {
  const str = String(value ?? '').trim();
  if (str === '1' || str === '2' || str === '3' || str === '4' || str === '5') {
    return str;
  }
  return fallback;
}

export function getOrbitThemePresetById(id: OrbitThemePresetId): OrbitThemePreset {
  return ORBIT_THEME_PRESETS.find((p) => p.id === id) || ORBIT_THEME_PRESETS[0];
}

export function getSavedOrbitTheme(userId?: string): OrbitThemePresetId {
  try {
    if (userId && userId !== 'guest_user') {
      const scoped = localStorage.getItem(`${ORBIT_THEME_STORAGE_KEY}_${userId}`);
      if (scoped) return normalizeOrbitThemePreset(scoped);
    }
    const saved = localStorage.getItem(ORBIT_THEME_STORAGE_KEY);
    if (saved) return normalizeOrbitThemePreset(saved);
  } catch {}
  return '1';
}

export function applyOrbitTheme(presetId: OrbitThemePresetId, userId?: string): void {
  const normalized = normalizeOrbitThemePreset(presetId);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-orbit', normalized);
  }
  try {
    localStorage.setItem(ORBIT_THEME_STORAGE_KEY, normalized);
    if (userId && userId !== 'guest_user') {
      localStorage.setItem(`${ORBIT_THEME_STORAGE_KEY}_${userId}`, normalized);
    }
  } catch {}
}
