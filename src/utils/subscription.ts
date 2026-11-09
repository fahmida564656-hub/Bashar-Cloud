import { UserSubscription, PaymentStatus } from '../types';

export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Calculates user subscription status based on registration time and approval status.
 */
export function calculateSubscription(
  registeredTimestamp?: number,
  isLifetimeApproved = false,
  paymentStatus: PaymentStatus = 'none',
  simulatedExpired = false
): UserSubscription {
  const timestamp = registeredTimestamp || Date.now();

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

  if (simulatedExpired) {
    return {
      registeredTimestamp: timestamp,
      trialDays: TRIAL_DURATION_DAYS,
      isLifetimeApproved: false,
      paymentStatus,
      isExpired: true,
      daysRemaining: 0,
    };
  }

  const elapsedMs = Date.now() - timestamp;
  const isPastTrial = elapsedMs >= TRIAL_DURATION_MS;

  const msRemaining = Math.max(0, TRIAL_DURATION_MS - elapsedMs);
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

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
 * Checks whether user has permission to upload, delete, view, or download.
 * Under user specifications:
 * "এক মাস ব্যবহার করতে পারবে। তারপর কোনো ফাইল আপলোড করতে পারবে না, ডিলিট করতে পারবে না, ডাউনলোড করতে পারবে না, দেখতে পারবে না।"
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
