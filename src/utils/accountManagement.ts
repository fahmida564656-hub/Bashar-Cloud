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
