import { RegisteredUser, CloudFile, StorageUsage, PaymentRequest } from '../types';

export interface PaymentOwnerTarget {
  id?: string;
  email?: string;
  phone?: string;
}

/**
 * Normalizes a phone string to its last 10 digits for resilient comparison (requires >= 7 digits).
 */
export function normalizeAccountPhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) return '';
  return digits.slice(-10);
}

/**
 * Returns true when a PaymentRequest belongs to the target account by ID, email, or phone.
 */
export function doesPaymentBelongToUser(
  payment: PaymentRequest,
  target: PaymentOwnerTarget
): boolean {
  if (!payment || !target) return false;

  const targetId = (target.id || '').trim();
  const targetEmail = (target.email || '').trim().toLowerCase();
  const targetPhone = normalizeAccountPhone(target.phone);

  if (!targetId && !targetEmail && !targetPhone) return false;

  const payUserId = (payment.userId || '').trim();
  const payUserIdLower = payUserId.toLowerCase();
  const payEmail = (payment.userEmail || '').trim().toLowerCase();
  const payUserPhone = normalizeAccountPhone(payment.userPhone);
  const paySenderPhone = normalizeAccountPhone(payment.senderPhone);
  const payUserIdPhone = normalizeAccountPhone(payUserId);

  if (targetId && targetId !== 'guest_user' && targetId !== 'guest-user' && payUserId === targetId) {
    return true;
  }

  if (targetEmail && (payEmail === targetEmail || payUserIdLower === targetEmail)) {
    return true;
  }

  if (
    targetPhone &&
    (payUserPhone === targetPhone ||
      paySenderPhone === targetPhone ||
      payUserIdPhone === targetPhone)
  ) {
    return true;
  }

  return false;
}

/**
 * Filters out every payment belonging to the deleted user account while preserving others.
 */
export function filterOutUserPayments(
  payments: PaymentRequest[],
  target: PaymentOwnerTarget
): PaymentRequest[] {
  if (!Array.isArray(payments)) return [];
  return payments.filter((p) => !doesPaymentBelongToUser(p, target));
}

/**
 * Filter out user by ID from registered users array
 */
export function removeUserFromList(users: RegisteredUser[], userId: string): RegisteredUser[] {
  if (!users || !userId) return users || [];
  return users.filter((u) => u.id !== userId);
}

/**
 * Filter out files belonging to a specific owner
 */
export function filterFilesByOwner(files: CloudFile[], ownerId?: string): CloudFile[] {
  if (!files) return [];
  if (!ownerId) return files;
  return files.filter((f) => !f.ownerId || f.ownerId === ownerId);
}

/**
 * Checks whether state is completely clean (zero files, zero used space)
 */
export function isStateClean(files: CloudFile[], storage: StorageUsage): boolean {
  return files.length === 0 && storage.usedGB === 0;
}

/**
 * Generates a deterministic canonical account ID from email or normalized phone
 * so accounts created across different websites converge on the exact same userId.
 */
export function buildDeterministicAccountId(email?: string, phone?: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    const sanitized = cleanEmail.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (sanitized) return `acct_${sanitized.slice(0, 96)}`;
  }
  const cleanDigits = normalizeAccountPhone(phone);
  if (cleanDigits) {
    return `phone_${cleanDigits}`;
  }
  return `user-${Date.now()}`;
}

/**
 * Finds all RegisteredUser records matching a target ID, email, or phone number
 * (important when legacy accounts were created separately on multiple websites).
 */
export function findMatchingUserRecords(
  users: RegisteredUser[],
  target: PaymentOwnerTarget
): RegisteredUser[] {
  if (!Array.isArray(users) || !target) return [];
  const targetId = (target.id || '').trim();
  const targetEmail = (target.email || '').trim().toLowerCase();
  const targetPhone = normalizeAccountPhone(target.phone);

  const matches: RegisteredUser[] = [];
  const seen = new Set<string>();

  for (const u of users) {
    if (!u || !u.id || seen.has(u.id)) continue;
    const uEmail = (u.email || '').trim().toLowerCase();
    const uPhone = normalizeAccountPhone(u.phone);
    const isMatch =
      (targetId && targetId !== 'guest_user' && u.id === targetId) ||
      (targetEmail && uEmail === targetEmail) ||
      (targetPhone && uPhone === targetPhone);
    if (isMatch) {
      seen.add(u.id);
      matches.push(u);
    }
  }
  return matches;
}

/**
 * Merges two RegisteredUser records belonging to the same user while preserving
 * approved lifetime unlock status, earliest registration timestamp, and richest profile data.
 */
export function mergeRegisteredUserRecords(
  primary: RegisteredUser,
  secondary: RegisteredUser
): RegisteredUser {
  const earliestTs = Math.min(
    primary.registeredTimestamp || Number.MAX_SAFE_INTEGER,
    secondary.registeredTimestamp || Number.MAX_SAFE_INTEGER
  );
  const resolvedApproved = Boolean(primary.isLifetimeApproved || secondary.isLifetimeApproved);
  const resolvedPaymentStatus =
    resolvedApproved || primary.paymentStatus === 'approved' || secondary.paymentStatus === 'approved'
      ? 'approved'
      : primary.paymentStatus === 'pending' || secondary.paymentStatus === 'pending'
      ? 'pending'
      : primary.paymentStatus || secondary.paymentStatus || 'none';

  return {
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    name: primary.name || secondary.name,
    email: (primary.email || secondary.email || '').trim().toLowerCase(),
    phone: primary.phone || secondary.phone,
    passwordPlain:
      primary.passwordPlain && primary.passwordPlain !== '••••••••'
        ? primary.passwordPlain
        : secondary.passwordPlain || primary.passwordPlain,
    avatarUrl: primary.avatarUrl || secondary.avatarUrl,
    registeredTimestamp:
      earliestTs < Number.MAX_SAFE_INTEGER ? earliestTs : primary.registeredTimestamp || Date.now(),
    filesCount: Math.max(primary.filesCount || 0, secondary.filesCount || 0),
    storageUsedMB: Math.max(primary.storageUsedMB || 0, secondary.storageUsedMB || 0),
    isLifetimeApproved: resolvedApproved,
    paymentStatus: resolvedPaymentStatus,
    lastTrxId: primary.lastTrxId || secondary.lastTrxId || '',
  };
}

/**
 * Collects all unique candidate owner IDs across websites for a given account
 * so files stored under deterministic, legacy, email-based, or phone-based IDs all sync cleanly.
 */
export function collectCandidateOwnerIds(options: {
  canonicalUserId?: string;
  matchedRecords?: RegisteredUser[];
  email?: string;
  phone?: string;
  extraIds?: string[];
}): string[] {
  const cleanEmail = (options.email || '').trim().toLowerCase();
  const emailSanitized = cleanEmail ? cleanEmail.replace(/[^a-z0-9]/g, '_') : '';
  const deterministicId =
    cleanEmail || normalizeAccountPhone(options.phone)
      ? buildDeterministicAccountId(cleanEmail, options.phone)
      : '';
  const phoneDigits = normalizeAccountPhone(options.phone);
  const phonePrefixed = phoneDigits ? `phone_${phoneDigits}` : '';

  const raw: Array<string | undefined> = [
    options.canonicalUserId,
    ...(options.matchedRecords || []).map((r) => r.id),
    ...(options.extraIds || []),
    deterministicId,
    emailSanitized,
    cleanEmail,
    phonePrefixed,
    phoneDigits,
  ];

  return Array.from(
    new Set(
      raw
        .map((id) => (id || '').trim())
        .filter((id) => id.length > 0 && id !== 'guest_user' && id !== 'guest-user')
    )
  );
}
