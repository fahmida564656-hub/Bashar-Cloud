export type StorageAlertLevel = 'normal' | 'warning' | 'critical';

/**
 * Checks if the storage usage has reached or exceeded the warning threshold (default: 90%).
 */
export function isStorageWarningThreshold(
  usedGB: number,
  totalGB: number,
  thresholdPercent = 90
): boolean {
  if (totalGB <= 0) return false;
  const percent = (usedGB / totalGB) * 100;
  return percent >= thresholdPercent;
}

/**
 * Returns the alert level based on used and total GB.
 * - normal: < 90%
 * - warning: 90% to 99.9%
 * - critical: >= 100%
 */
export function getStorageAlertLevel(usedGB: number, totalGB: number): StorageAlertLevel {
  if (totalGB <= 0) return 'normal';
  const percent = (usedGB / totalGB) * 100;
  if (percent >= 100) return 'critical';
  if (percent >= 90) return 'warning';
  return 'normal';
}

/**
 * Returns visual styles/classes corresponding to the storage alert level.
 */
export function getStorageAlertStyles(alertLevel: StorageAlertLevel) {
  switch (alertLevel) {
    case 'critical':
      return {
        cardBorder: 'border-rose-500/70 shadow-rose-950/60 bg-gradient-to-br from-[#3b1219] via-[#4d131f] to-[#280c12]',
        barGradient: 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-400 shadow-lg shadow-rose-500/50',
        badgeClass: 'bg-rose-500/30 text-rose-200 border-rose-400/50',
        warningBannerClass: 'bg-rose-950/80 border-rose-500/60 text-rose-200',
        alertTitle: 'Storage Limit Exceeded (স্টোরেজ পূর্ণ)',
      };
    case 'warning':
      return {
        cardBorder: 'border-amber-500/60 shadow-amber-950/50 bg-gradient-to-br from-[#2a1d0f] via-[#3a2613] to-[#1c1309]',
        barGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-lg shadow-amber-500/40 animate-pulse',
        badgeClass: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
        warningBannerClass: 'bg-amber-950/80 border-amber-500/60 text-amber-200',
        alertTitle: 'Storage Limit Warning: 90% Reached (স্টোরেজ সতর্কবার্তা)',
      };
    case 'normal':
    default:
      return {
        cardBorder: 'border-sky-500/20 bg-gradient-to-br from-[#12396d] via-[#104b86] to-[#096a94]',
        barGradient: 'bg-gradient-to-r from-sky-200 via-sky-300 to-white shadow-sm',
        badgeClass: 'bg-black/25 text-sky-100 border-white/15',
        warningBannerClass: '',
        alertTitle: '',
      };
  }
}
