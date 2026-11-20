import { auth } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let firestoreQuotaCooldownUntil = 0;
let firestoreWriteQuotaCooldownUntil = 0;

export function markFirestoreQuotaCooldown(durationMs = 120_000): void {
  firestoreQuotaCooldownUntil = Math.max(firestoreQuotaCooldownUntil, Date.now() + durationMs);
}

export function isFirestoreQuotaCooldownActive(): boolean {
  return Date.now() < firestoreQuotaCooldownUntil;
}

export function markFirestoreWriteQuotaCooldown(durationMs = 120_000): void {
  firestoreWriteQuotaCooldownUntil = Math.max(firestoreWriteQuotaCooldownUntil, Date.now() + durationMs);
}

export function isFirestoreWriteQuotaCooldownActive(): boolean {
  return Date.now() < firestoreWriteQuotaCooldownUntil;
}

export function isFirestoreHardQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily read units')
  );
}

export function isFirestoreQuotaOrTransientError(error: unknown): boolean {
  if (isFirestoreHardQuotaError(error)) return true;
  const msg = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return (
    msg.includes('unavailable') ||
    msg.includes('deadline-exceeded') ||
    msg.includes('timeout')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (isFirestoreHardQuotaError(error)) {
    if (
      operationType === OperationType.WRITE ||
      operationType === OperationType.CREATE ||
      operationType === OperationType.UPDATE ||
      operationType === OperationType.DELETE
    ) {
      markFirestoreWriteQuotaCooldown();
    } else {
      markFirestoreQuotaCooldown();
    }
    console.warn(`Firestore quota exceeded (${operationType} ${path}):`, rawMessage);
    return;
  }
  if (isFirestoreQuotaOrTransientError(error)) {
    console.warn(`Firestore transient note (${operationType} ${path}):`, rawMessage);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
