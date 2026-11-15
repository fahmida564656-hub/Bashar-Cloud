import { UserSubscription, PaymentStatus } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * DAY_MS;

const TRIAL_START_STORAGE_PREFIX = 'bashar_cloud_trial_start_';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

/**
 * Converts ASCII digits (0-9) into Bengali numerals (০-৯).
 */
export function toBengaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

/**
 * Safely reads a user's persisted trial start timestamp from localStorage.
 */
export function loadTrialStartTimestamp(userKey: string): number | undefined {
  if (!userKey) return undefined;
  try {
    const raw = localStorage.getItem(`${TRIAL_START_STORAGE_PREFIX}${userKey}`);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Persists a user's trial start timestamp in localStorage if valid.
 * Never overwrites an earlier valid timestamp with a newer one unless forced.
 */
export function saveTrialStartTimestamp(userKey: string, timestamp: number, force = false): number {
  const safeTs = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  if (!userKey) return safeTs;

  try {
    const existing = loadTrialStartTimestamp(userKey);
    const chosen = !force && existing ? Math.min(existing, safeTs) : safeTs;
    localStorage.setItem(`${TRIAL_START_STORAGE_PREFIX}${userKey}`, String(chosen));
    return chosen;
  } catch {
    return safeTs;
  }
}

/**
 * Calculates user subscription status based on registration time and approval status.
 * Daily countdown rules:
 * - Day 0 (< 24h elapsed): 30 days remaining
 * - After 1 day (>= 24h elapsed): 29 days remaining
 * - After 2 days (>= 48h elapsed): 28 days remaining
 * - ...
 * - After 30 days (>= 30 * 24h elapsed): 0 days remaining, expired & locked until 100 TK payment approved
 */
export function calculateSubscription(
  registeredTimestamp?: number,
  isLifetimeApproved = false,
  paymentStatus: PaymentStatus = 'none',
  nowMs: number = Date.now()
): UserSubscription {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const timestamp =
    typeof registeredTimestamp === 'number' && Number.isFinite(registeredTimestamp) && registeredTimestamp > 0
      ? registeredTimestamp
      : safeNow;

  if (isLifetimeApproved) {
    return {
      registeredTimestamp: timestamp,
      trialDays: TRIAL_DURATION_DAYS,
      isLifetimeApproved: true,
      paymentStatus: 'approved',
      isExpired: false,
      daysRemaining: 9999,
    };
  }

  const elapsedMs = Math.max(0, safeNow - timestamp);
  const elapsedDays = Math.floor(elapsedMs / DAY_MS);
  const isPastTrial = elapsedMs >= TRIAL_DURATION_MS;
  const daysRemaining = isPastTrial ? 0 : Math.max(0, TRIAL_DURATION_DAYS - elapsedDays);

  return {
    registeredTimestamp: timestamp,
    trialDays: TRIAL_DURATION_DAYS,
    isLifetimeApproved: false,
    paymentStatus,
    isExpired: isPastTrial,
    daysRemaining,
  };
}

/**
 * Checks whether user has permission to upload, delete, rename, view, or download.
 * After 30 days expire without 100 TK approval, all file operations are strictly locked.
 */
export function canPerformFileAction(subscription: UserSubscription): boolean {
  if (subscription.isLifetimeApproved) return true;
  return !subscription.isExpired;
}

/**
 * Validates Bangladeshi mobile phone numbers (11 digits, starts with 01)
 */
export function validateBangladeshiPhone(phone: string): boolean {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11 && clean.startsWith('01')) return true;
  if (clean.length === 13 && clean.startsWith('8801')) return true;
  return false;
}

/**
 * Validates bKash / Nagad transaction ID
 */
export function validateTrxId(trxId: string): boolean {
  const clean = trxId.trim();
  return clean.length >= 6 && /^[a-zA-Z0-9_-]+$/.test(clean);
}
