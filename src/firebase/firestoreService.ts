import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where,
  limit,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import {
  handleFirestoreError,
  isFirestoreHardQuotaError,
  isFirestoreQuotaCooldownActive,
  isFirestoreQuotaOrTransientError,
  isFirestoreWriteQuotaCooldownActive,
  markFirestoreQuotaCooldown,
  markFirestoreWriteQuotaCooldown,
  OperationType,
} from './errorHandler';
import {
  CloudFile,
  UserProfile,
  StorageUsage,
  RegisteredUser,
  SiteSettings,
  PaymentRequest,
  AiChatThread,
  AdminAnnouncement,
} from '../types';
import {
  sanitizeFileForPersistence,
  sanitizeFirestoreMediaUrl,
  fitFilePayloadToFirestoreLimit,
  stripUndefinedDeep,
} from '../utils/fileVault';
import {
  normalizeAnnouncementCategory,
  sortAnnouncementsNewestFirst,
} from '../utils/announcements';
import {
  buildDeterministicAccountId,
  doesPaymentBelongToUser,
  mergeRegisteredUserRecords,
  normalizeAccountPhone,
  selectCanonicalUserRecord,
  PaymentOwnerTarget,
} from '../utils/accountManagement';
import {
  areCloudChunksComplete,
  buildChunkDocId,
  CloudChunkRecord,
  getMissingChunkIndices,
  inferMediaMimeType,
  reassembleCloudChunksToBlob,
  shouldChunkFileToCloud,
  splitBinaryIntoCloudChunks,
} from '../utils/cloudChunkSync';

const withFirestoreTimeout = <T>(promise: Promise<T>, ms = 4500, label = 'Firestore'): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ]);

const fetchServerCloudUsers = async (): Promise<RegisteredUser[]> => {
  try {
    const res = await fetch('/api/cloud/users');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.users) ? (data.users as RegisteredUser[]) : [];
  } catch {
    return [];
  }
};

const fetchServerCloudFiles = async (userId: string): Promise<CloudFile[]> => {
  try {
    const res = await fetch(`/api/cloud/files/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.files) ? (data.files as CloudFile[]) : [];
  } catch {
    return [];
  }
};

export const firestoreService = {
  // Fast binary server transport (/api/media) for zero-quota-lag video/audio/photo sync
  async uploadMediaBlobToServer(
    userId: string,
    fileId: string,
    blob: Blob,
    mimeType?: string,
    fileName?: string
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user' || !fileId || !blob || blob.size === 0) return false;
    try {
      const resolvedMime = inferMediaMimeType(fileName, mimeType || blob.type);
      const res = await fetch(
        `/api/media/${encodeURIComponent(userId)}/${encodeURIComponent(fileId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': resolvedMime,
            'x-file-mime': resolvedMime,
            'x-file-name': encodeURIComponent(fileName || fileId),
          },
          body: blob,
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchMediaBlobFromServer(
    userId: string,
    fileId: string,
    fileName?: string,
    expectedMimeType?: string
  ): Promise<Blob | null> {
    if (!userId || userId === 'guest_user' || !fileId) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `/api/media/${encodeURIComponent(userId)}/${encodeURIComponent(fileId)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob || blob.size === 0) return null;
        const finalMime = inferMediaMimeType(
          fileName,
          res.headers.get('content-type') || expectedMimeType || blob.type
        );
        return blob.type === finalMime ? blob : new Blob([blob], { type: finalMime });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null;
    }
  },

  async deleteMediaFromServer(userId: string, fileId?: string): Promise<void> {
    if (!userId || userId === 'guest_user') return;
    try {
      const path = fileId
        ? `/api/media/${encodeURIComponent(userId)}/${encodeURIComponent(fileId)}`
        : `/api/media/${encodeURIComponent(userId)}`;
      await fetch(path, { method: 'DELETE' });
    } catch {}
  },

  async getMirrorUsers(): Promise<RegisteredUser[]> {
    return fetchServerCloudUsers();
  },
  // ==========================================
  // 1. REGISTERED USERS (CROSS-SITE & GLOBAL)
  // ==========================================

  /**
   * Save or update registered user credentials in Firestore
   * Ensures instant sync across all websites, domains, and devices.
   */
  async saveRegisteredUser(user: RegisteredUser): Promise<boolean> {
    const path = `registered_users/${user.id}`;
    const cleanPhone = normalizeAccountPhone(user.phone);
    const cleanEmail = (user.email || '').trim().toLowerCase();

    const mirrorPromise = fetch('/api/cloud/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...user,
        email: cleanEmail,
        avatarUrl: sanitizeFirestoreMediaUrl(user.avatarUrl, 180_000),
      }),
    })
      .then((r) => r.ok)
      .catch(() => false);

    const writeDoc = (withAvatar: boolean) =>
      setDoc(
        doc(db, 'registered_users', user.id),
        {
          id: user.id,
          name: user.name,
          email: cleanEmail,
          phone: user.phone || '',
          cleanPhone,
          passwordPlain: user.passwordPlain || '',
          avatarUrl: withAvatar ? sanitizeFirestoreMediaUrl(user.avatarUrl, 180_000) : '',
          registeredAt: user.registeredAt,
          registeredTimestamp: user.registeredTimestamp || Date.now(),
          filesCount: user.filesCount || 0,
          storageUsedMB: user.storageUsedMB || 0,
          isLifetimeApproved: Boolean(user.isLifetimeApproved),
          paymentStatus: user.paymentStatus || 'none',
          lastTrxId: user.lastTrxId || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    await mirrorPromise;

    if (isFirestoreWriteQuotaCooldownActive()) {
      return false;
    }

    try {
      await withFirestoreTimeout(writeDoc(true), 10_000, 'saveRegisteredUser');
      return true;
    } catch (error) {
      if (isFirestoreHardQuotaError(error)) {
        markFirestoreWriteQuotaCooldown();
        handleFirestoreError(error, OperationType.WRITE, path);
        return false;
      }
      // Retry once without avatarUrl in case bulky avatar caused payload/latency failure so login credentials still sync cross-site
      if (user.avatarUrl) {
        try {
          await withFirestoreTimeout(writeDoc(false), 10_000, 'saveRegisteredUser_core');
          return true;
        } catch (retryErr) {
          if (isFirestoreHardQuotaError(retryErr)) {
            markFirestoreWriteQuotaCooldown();
          }
          handleFirestoreError(retryErr, OperationType.WRITE, path);
          return false;
        }
      }
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  /**
   * Persist a reset password across canonical & legacy matching registered_users docs
   * plus the server cloud state mirror so new password works across Website 1 & Website 2.
   */
  async updateRegisteredAccountPassword(params: {
    email: string;
    newPassword: string;
    targetUser?: RegisteredUser | null;
    matchingIds?: string[];
  }): Promise<RegisteredUser | null> {
    const cleanEmail = (params.email || '').trim().toLowerCase();
    if (!cleanEmail || !params.newPassword) return null;

    const baseUser: RegisteredUser = params.targetUser
      ? {
          ...params.targetUser,
          email: cleanEmail,
          passwordPlain: params.newPassword,
        }
      : {
          id: buildDeterministicAccountId(cleanEmail),
          name: cleanEmail.split('@')[0] || 'User',
          email: cleanEmail,
          phone: '',
          passwordPlain: params.newPassword,
          registeredAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          registeredTimestamp: Date.now(),
          filesCount: 0,
          storageUsedMB: 0,
          isLifetimeApproved: false,
          paymentStatus: 'none',
        };

    const detId = buildDeterministicAccountId(cleanEmail, baseUser.phone);
    const idsToSync = Array.from(
      new Set(
        [baseUser.id, detId, ...(params.matchingIds || [])]
          .map((id) => (id || '').trim())
          .filter(Boolean)
      )
    );

    await fetch('/api/cloud/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseUser,
        avatarUrl: sanitizeFirestoreMediaUrl(baseUser.avatarUrl, 180_000),
      }),
    }).catch(() => {});

    if (!isFirestoreWriteQuotaCooldownActive()) {
      for (const docId of idsToSync) {
        const path = `registered_users/${docId}`;
        try {
          if (docId === baseUser.id) {
            await withFirestoreTimeout(
              setDoc(
                doc(db, 'registered_users', docId),
                {
                  id: docId,
                  name: baseUser.name,
                  email: cleanEmail,
                  phone: baseUser.phone || '',
                  cleanPhone: normalizeAccountPhone(baseUser.phone),
                  passwordPlain: params.newPassword,
                  registeredAt: baseUser.registeredAt,
                  registeredTimestamp: baseUser.registeredTimestamp || Date.now(),
                  filesCount: baseUser.filesCount || 0,
                  storageUsedMB: baseUser.storageUsedMB || 0,
                  isLifetimeApproved: Boolean(baseUser.isLifetimeApproved),
                  paymentStatus: baseUser.paymentStatus || 'none',
                  lastTrxId: baseUser.lastTrxId || '',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              ),
              10_000,
              'updateAccountPassword'
            );
          } else {
            await withFirestoreTimeout(
              setDoc(
                doc(db, 'registered_users', docId),
                {
                  email: cleanEmail,
                  passwordPlain: params.newPassword,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              ),
              10_000,
              'updateLegacyAccountPassword'
            );
          }
        } catch (error) {
          if (isFirestoreHardQuotaError(error)) {
            markFirestoreWriteQuotaCooldown();
            handleFirestoreError(error, OperationType.WRITE, path);
            break;
          }
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }

    return baseUser;
  },

  /**
   * Lightweight check (reads at most 1 doc) to know whether any registered account exists in cloud.
   */
  async hasAnyRegisteredUsers(): Promise<boolean> {
    const mirror = await fetchServerCloudUsers();
    if (mirror.length > 0) return true;
    if (isFirestoreQuotaCooldownActive()) return false;
    try {
      const snap = await withFirestoreTimeout(
        getDocs(query(collection(db, 'registered_users'), limit(1))),
        4500,
        'hasAnyRegisteredUsers'
      );
      if (!snap.empty) return true;
    } catch (err) {
      if (isFirestoreHardQuotaError(err)) {
        markFirestoreQuotaCooldown();
      }
    }
    return false;
  },

  /**
   * Fetch all registered users from Firestore (Admin Panel usage) with server mirror fallback.
   */
  async getRegisteredUsersWithMeta(): Promise<{ users: RegisteredUser[]; fromCache: boolean } | null> {
    const path = 'registered_users';
    try {
      const snapshot = await withFirestoreTimeout(
        getDocs(collection(db, 'registered_users')),
        7500,
        'getRegisteredUsers'
      );
      const list: RegisteredUser[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          passwordPlain: d.passwordPlain || '',
          avatarUrl: d.avatarUrl || '',
          registeredAt: d.registeredAt || '',
          registeredTimestamp: d.registeredTimestamp || Date.now(),
          filesCount: d.filesCount || 0,
          storageUsedMB: d.storageUsedMB || 0,
          isLifetimeApproved: Boolean(d.isLifetimeApproved),
          paymentStatus: d.paymentStatus || 'none',
          lastTrxId: d.lastTrxId || '',
        });
      });
      return { users: list, fromCache: snapshot.metadata.fromCache };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      const mirrorUsers = await fetchServerCloudUsers();
      return mirrorUsers.length > 0 ? { users: mirrorUsers, fromCache: false } : null;
    }
  },

  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    const result = await this.getRegisteredUsersWithMeta();
    return result ? result.users : [];
  },

  /**
   * Cross-website O(1) indexed lookup for a registered user by email, phone, or ID.
   * Consolidates duplicate legacy records across websites and surfaces quota exhaustion cleanly.
   */
  async lookupRegisteredAccount(identifier: string | string[]): Promise<{
    user: RegisteredUser | null;
    matchingIds: string[];
    quotaExceeded: boolean;
  }> {
    const rawInputs = Array.isArray(identifier) ? identifier : [identifier];
    const queries = rawInputs
      .map((val) => (val || '').trim())
      .filter(Boolean)
      .map((trimmed) => ({
        trimmed,
        lower: trimmed.toLowerCase(),
        cleanDigits: normalizeAccountPhone(trimmed),
      }));
    if (queries.length === 0) {
      return { user: null, matchingIds: [], quotaExceeded: false };
    }

    const mapDoc = (docId: string, d: DocumentData): RegisteredUser => ({
      id: docId,
      name: d.name || '',
      email: d.email || '',
      phone: d.phone || '',
      passwordPlain: d.passwordPlain || '',
      avatarUrl: d.avatarUrl || '',
      registeredAt: d.registeredAt || '',
      registeredTimestamp: d.registeredTimestamp || Date.now(),
      filesCount: d.filesCount || 0,
      storageUsedMB: d.storageUsedMB || 0,
      isLifetimeApproved: Boolean(d.isLifetimeApproved),
      paymentStatus: d.paymentStatus || 'none',
      lastTrxId: d.lastTrxId || '',
    });

    const matchesList = (candidates: RegisteredUser[]): RegisteredUser[] => {
      const found: RegisteredUser[] = [];
      const seen = new Set<string>();
      for (const u of candidates) {
        if (!u || !u.id || seen.has(u.id)) continue;
        const uPhone = normalizeAccountPhone(u.phone);
        const uEmail = (u.email || '').trim().toLowerCase();
        for (const q of queries) {
          if (
            u.id === q.trimmed ||
            (uEmail && uEmail === q.lower) ||
            (q.cleanDigits.length >= 7 && uPhone === q.cleanDigits)
          ) {
            seen.add(u.id);
            found.push(u);
            break;
          }
        }
      }
      return found;
    };

    const collected = new Map<string, RegisteredUser>();
    let quotaExceeded = false;
    let firestoreMatched = false;

    const addMatch = (u: RegisteredUser | null, fromFirestore = false) => {
      if (u && u.id) {
        if (fromFirestore) firestoreMatched = true;
        const existing = collected.get(u.id);
        collected.set(u.id, existing ? mergeRegisteredUserRecords(u, existing) : u);
      }
    };

    // 1. Check same-origin server mirror first as fallback cache (never blocks fresh Firestore checks)
    const mirrorUsers = await fetchServerCloudUsers();
    matchesList(mirrorUsers).forEach((u) => addMatch(u, false));

    if (isFirestoreQuotaCooldownActive()) {
      const records = Array.from(collected.values());
      const unified = selectCanonicalUserRecord(records);
      if (!unified) {
        return { user: null, matchingIds: [], quotaExceeded: true };
      }
      return {
        user: unified,
        matchingIds: records.map((r) => r.id),
        quotaExceeded: false,
      };
    }

    // 2. Targeted Firestore O(1) lookup: try deterministic email & phone doc IDs before query fallbacks
    for (const q of queries) {
      const candidateDetIds: string[] = [];
      if (q.lower.includes('@')) {
        candidateDetIds.push(buildDeterministicAccountId(q.lower, undefined));
      } else if (q.cleanDigits.length >= 7) {
        candidateDetIds.push(buildDeterministicAccountId(undefined, q.cleanDigits));
      }

      for (const detId of candidateDetIds) {
        try {
          const ds = await withFirestoreTimeout(
            getDoc(doc(db, 'registered_users', detId)),
            5000,
            'getUserDetId'
          );
          if (ds.exists()) {
            addMatch(mapDoc(ds.id, ds.data()), true);
          }
        } catch (err) {
          if (isFirestoreHardQuotaError(err)) quotaExceeded = true;
        }
      }
    }

    // 3. Run indexed email/phone queries whenever Firestore has not confirmed a match yet (so legacy user-* IDs are always found)
    if (!firestoreMatched && !quotaExceeded) {
      const indexedTasks: Promise<void>[] = [];
      for (const q of queries) {
        if (q.lower.includes('@')) {
          indexedTasks.push(
            withFirestoreTimeout(
              getDocs(query(collection(db, 'registered_users'), where('email', '==', q.lower), limit(5))),
              6000,
              'findUserByEmail'
            )
              .then((snap) => {
                snap.forEach((ds) => addMatch(mapDoc(ds.id, ds.data()), true));
              })
              .catch((err) => {
                if (isFirestoreHardQuotaError(err)) quotaExceeded = true;
              })
          );
        }
        if (q.cleanDigits.length >= 7) {
          indexedTasks.push(
            withFirestoreTimeout(
              getDocs(query(collection(db, 'registered_users'), where('cleanPhone', '==', q.cleanDigits), limit(5))),
              6000,
              'findUserByPhone'
            )
              .then((snap) => {
                snap.forEach((ds) => addMatch(mapDoc(ds.id, ds.data()), true));
              })
              .catch((err) => {
                if (isFirestoreHardQuotaError(err)) quotaExceeded = true;
              })
          );
        }
      }
      if (indexedTasks.length > 0) {
        await Promise.all(indexedTasks);
      }
    }

    if (quotaExceeded) {
      markFirestoreQuotaCooldown();
    }

    const records = Array.from(collected.values());
    const unified = selectCanonicalUserRecord(records);
    if (!unified) {
      return { user: null, matchingIds: [], quotaExceeded };
    }

    // Warm local server mirror so subsequent logins on this server cost 0 Firestore reads
    fetch('/api/cloud/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unified),
    }).catch(() => {});

    return {
      user: unified,
      matchingIds: records.map((r) => r.id),
      quotaExceeded,
    };
  },

  /**
   * Backward-compatible single-record wrapper around lookupRegisteredAccount.
   */
  async findRegisteredUser(identifier: string | string[]): Promise<RegisteredUser | null> {
    const res = await this.lookupRegisteredAccount(identifier);
    return res.user;
  },

  /**
   * Subscribe to ONLY the active user's registered_users document (1 doc instead of entire collection).
   */
  subscribeToUserRecord(
    userId: string,
    onData: (user: RegisteredUser | null, meta?: { fromCache: boolean }) => void
  ): () => void {
    if (!userId || userId === 'guest_user') return () => {};
    return onSnapshot(
      doc(db, 'registered_users', userId),
      (docSnap) => {
        if (!docSnap.exists()) {
          onData(null, { fromCache: docSnap.metadata.fromCache });
          return;
        }
        const d = docSnap.data();
        onData(
          {
            id: docSnap.id,
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            passwordPlain: d.passwordPlain || '',
            avatarUrl: d.avatarUrl || '',
            registeredAt: d.registeredAt || '',
            registeredTimestamp: d.registeredTimestamp || Date.now(),
            filesCount: d.filesCount || 0,
            storageUsedMB: d.storageUsedMB || 0,
            isLifetimeApproved: Boolean(d.isLifetimeApproved),
            paymentStatus: d.paymentStatus || 'none',
            lastTrxId: d.lastTrxId || '',
          },
          { fromCache: docSnap.metadata.fromCache }
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `registered_users/${userId}`);
      }
    );
  },

  /**
   * Subscribe to real-time registered users list updates from Firestore
   */
  subscribeToRegisteredUsers(
    onData: (users: RegisteredUser[], meta?: { fromCache: boolean }) => void
  ): () => void {
    const path = 'registered_users';
    return onSnapshot(
      collection(db, 'registered_users'),
      (snapshot) => {
        const users: RegisteredUser[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          users.push({
            id: docSnap.id,
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            passwordPlain: d.passwordPlain || '',
            avatarUrl: d.avatarUrl || '',
            registeredAt: d.registeredAt || '',
            registeredTimestamp: d.registeredTimestamp || Date.now(),
            filesCount: d.filesCount || 0,
            storageUsedMB: d.storageUsedMB || 0,
            isLifetimeApproved: Boolean(d.isLifetimeApproved),
            paymentStatus: d.paymentStatus || 'none',
            lastTrxId: d.lastTrxId || '',
          });
        });
        onData(users, { fromCache: snapshot.metadata.fromCache });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  /**
   * Delete registered user from Firestore
   */
  async deleteRegisteredUser(userId: string): Promise<void> {
    const path = `registered_users/${userId}`;
    fetch(`/api/cloud/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
    try {
      await withFirestoreTimeout(
        deleteDoc(doc(db, 'registered_users', userId)),
        4000,
        'deleteRegisteredUser'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Delete every payment_request document belonging to a user (matched by id, email, or phone)
   */
  async deleteUserPaymentRequests(target: PaymentOwnerTarget): Promise<void> {
    try {
      const snap = await withFirestoreTimeout(
        getDocs(collection(db, 'payment_requests')),
        4000,
        'getPaymentRequestsForDelete'
      );
      const payDeletes: Promise<void>[] = [];
      snap.forEach((pDoc) => {
        const data = pDoc.data() as PaymentRequest;
        if (doesPaymentBelongToUser({ ...data, id: data.id || pDoc.id }, target)) {
          payDeletes.push(deleteDoc(pDoc.ref));
        }
      });
      if (payDeletes.length > 0) {
        await withFirestoreTimeout(Promise.all(payDeletes), 4000, 'deleteUserPaymentRequests');
      }
    } catch (err) {
      console.warn('Could not delete user payment requests:', err);
    }
  },

  /**
   * Delete every document in payment_requests
   */
  async deleteAllPaymentRequests(): Promise<void> {
    try {
      const snap = await withFirestoreTimeout(
        getDocs(collection(db, 'payment_requests')),
        4000,
        'getAllPaymentRequestsForDelete'
      );
      const deletes: Promise<void>[] = [];
      snap.forEach((pDoc) => {
        deletes.push(deleteDoc(pDoc.ref));
      });
      if (deletes.length > 0) {
        await withFirestoreTimeout(Promise.all(deletes), 4000, 'deleteAllPaymentRequests');
      }
    } catch (err) {
      console.warn('Error deleting all payment requests:', err);
    }
  },

  /**
   * Delete registered user and completely wipe all their cloud files, storage, chats, and payment data
   */
  async deleteRegisteredUserAndData(
    userId: string,
    fallbackContact?: { email?: string; phone?: string }
  ): Promise<void> {
    const path = `registered_users/${userId}`;
    try {
      let targetEmail = fallbackContact?.email || '';
      let targetPhone = fallbackContact?.phone || '';
      if (!targetEmail || !targetPhone) {
        try {
          const userSnap = await getDoc(doc(db, 'registered_users', userId));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            if (!targetEmail && typeof ud.email === 'string') targetEmail = ud.email;
            if (!targetPhone && typeof ud.phone === 'string') targetPhone = ud.phone;
          }
        } catch {}
      }

      const subcollectionCleanup = async () => {
        try {
          const [filesSnap, binSnap, aiSnap, chunkSnap] = await Promise.all([
            getDocs(collection(db, 'users', userId, 'files')),
            getDocs(collection(db, 'users', userId, 'recycle_bin')),
            getDocs(collection(db, 'users', userId, 'ai_chats')),
            getDocs(collection(db, 'users', userId, 'file_chunks')),
          ]);
          const deletePromises: Promise<void>[] = [];
          filesSnap.forEach((fileDoc) => deletePromises.push(deleteDoc(fileDoc.ref)));
          binSnap.forEach((binDoc) => deletePromises.push(deleteDoc(binDoc.ref)));
          aiSnap.forEach((chatDoc) => deletePromises.push(deleteDoc(chatDoc.ref)));
          chunkSnap.forEach((chunkDoc) => deletePromises.push(deleteDoc(chunkDoc.ref)));
          await Promise.all(deletePromises);
        } catch (fileErr) {
          console.warn('Could not delete user files during account deletion:', fileErr);
        }
      };

      fetch(`/api/cloud/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
      fetch(`/api/media/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});

      await withFirestoreTimeout(
        Promise.all([
          deleteDoc(doc(db, 'registered_users', userId)),
          subcollectionCleanup(),
          deleteDoc(doc(db, 'users', userId, 'storage', 'usage')).catch(() => {}),
          deleteDoc(doc(db, 'users', userId)).catch(() => {}),
          this.deleteUserPaymentRequests({
            id: userId,
            email: targetEmail,
            phone: targetPhone,
          }),
        ]),
        5000,
        'deleteRegisteredUserAndData'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Clear all files (and recycle bin) for a specific user in Firestore
   */
  async clearAllUserFiles(userId: string): Promise<void> {
    try {
      fetch(`/api/cloud/files/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
      fetch(`/api/media/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
      const [filesSnap, binSnap, chunksSnap] = await withFirestoreTimeout(
        Promise.all([
          getDocs(collection(db, 'users', userId, 'files')),
          getDocs(collection(db, 'users', userId, 'recycle_bin')),
          getDocs(collection(db, 'users', userId, 'file_chunks')),
        ]),
        5000,
        'clearAllUserFiles'
      );
      const deletePromises: Promise<void>[] = [];
      filesSnap.forEach((fileDoc) => {
        deletePromises.push(deleteDoc(fileDoc.ref));
      });
      binSnap.forEach((binDoc) => {
        deletePromises.push(deleteDoc(binDoc.ref));
      });
      chunksSnap.forEach((chunkDoc) => {
        deletePromises.push(deleteDoc(chunkDoc.ref));
      });
      await Promise.all(deletePromises);
    } catch (error) {
      console.warn('Error clearing user files:', error);
    }
  },

  /**
   * Delete all registered accounts, files, and payment requests from Firestore
   */
  async deleteAllRegisteredAccounts(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'registered_users'));
      for (const d of snap.docs) {
        const data = d.data();
        await this.deleteRegisteredUserAndData(d.id, {
          email: typeof data.email === 'string' ? data.email : undefined,
          phone: typeof data.phone === 'string' ? data.phone : undefined,
        });
      }
      await this.deleteAllPaymentRequests();
    } catch (error) {
      console.warn('Error deleting all accounts:', error);
    }
  },

  // ==========================================
  // 2. SITE SETTINGS (GLOBAL & CROSS-SITE)
  // ==========================================

  async saveSiteSettings(settings: SiteSettings): Promise<void> {
    const path = 'site_settings/global';
    try {
      await withFirestoreTimeout(
        setDoc(doc(db, 'site_settings', 'global'), {
          websiteName: settings.websiteName,
          logoUrl: sanitizeFirestoreMediaUrl(settings.logoUrl, 240_000),
          totalStorageGB: settings.totalStorageGB || 1000,
          bkashNumber: settings.bkashNumber || '01734211584',
          nagadNumber: settings.nagadNumber || '01734211584',
          subscriptionFee: settings.subscriptionFee || 100,
          updatedAt: new Date().toISOString(),
        }, { merge: true }),
        4000,
        'saveSiteSettings'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getSiteSettings(): Promise<Partial<SiteSettings> | null> {
    try {
      const snap = await withFirestoreTimeout(
        getDoc(doc(db, 'site_settings', 'global')),
        4000,
        'getSiteSettings'
      );
      if (snap.exists()) {
        return snap.data() as Partial<SiteSettings>;
      }
      return null;
    } catch {
      return null;
    }
  },

  subscribeToSiteSettings(onData: (settings: Partial<SiteSettings>) => void): () => void {
    return onSnapshot(
      doc(db, 'site_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as Partial<SiteSettings>);
        }
      },
      () => {}
    );
  },

  // ==========================================
  // 3. PAYMENT REQUESTS (BKASH / NAGAD 100 TK)
  // ==========================================

  async savePaymentRequest(payment: PaymentRequest): Promise<void> {
    const path = `payment_requests/${payment.id}`;
    try {
      await withFirestoreTimeout(
        setDoc(
          doc(db, 'payment_requests', payment.id),
          {
            id: payment.id,
            userId: payment.userId,
            userName: payment.userName,
            userEmail: payment.userEmail || '',
            userPhone: payment.userPhone || '',
            method: payment.method,
            senderPhone: payment.senderPhone,
            transactionId: payment.transactionId,
            amount: payment.amount || 100,
            submittedAt: payment.submittedAt,
            submittedTimestamp: payment.submittedTimestamp,
            status: payment.status,
            adminNote: payment.adminNote || '',
            reviewedAt: payment.reviewedAt || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        4000,
        'savePaymentRequest'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPaymentRequestsWithMeta(): Promise<{ payments: PaymentRequest[]; fromCache: boolean } | null> {
    try {
      const snapshot = await withFirestoreTimeout(
        getDocs(collection(db, 'payment_requests')),
        4000,
        'getPaymentRequests'
      );
      const list: PaymentRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PaymentRequest);
      });
      return { payments: list, fromCache: snapshot.metadata.fromCache };
    } catch {
      return null;
    }
  },

  async getPaymentRequests(): Promise<PaymentRequest[]> {
    const res = await this.getPaymentRequestsWithMeta();
    return res ? res.payments : [];
  },

  subscribeToPaymentRequests(
    onData: (list: PaymentRequest[], meta?: { fromCache: boolean }) => void
  ): () => void {
    return onSnapshot(
      collection(db, 'payment_requests'),
      (snapshot) => {
        const list: PaymentRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PaymentRequest);
        });
        onData(list, { fromCache: snapshot.metadata.fromCache });
      },
      () => {}
    );
  },

  subscribeToUserPayments(
    userId: string,
    onData: (list: PaymentRequest[], meta?: { fromCache: boolean }) => void
  ): () => void {
    if (!userId || userId === 'guest_user') return () => {};
    return onSnapshot(
      query(collection(db, 'payment_requests'), where('userId', '==', userId)),
      (snapshot) => {
        const list: PaymentRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PaymentRequest);
        });
        onData(list, { fromCache: snapshot.metadata.fromCache });
      },
      () => {}
    );
  },

  // ==========================================
  // 4. USER PROFILES & FILES
  // ==========================================

  async saveUserProfile(userId: string, user: UserProfile): Promise<void> {
    const path = `users/${userId}`;
    try {
      await withFirestoreTimeout(
        setDoc(
          doc(db, 'users', userId),
          {
            name: (user.name || '').slice(0, 200),
            phone: (user.phone || '').slice(0, 60),
            email: (user.email || '').slice(0, 200),
            avatarUrl: sanitizeFirestoreMediaUrl(user.avatarUrl, 180_000),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        6000,
        'saveUserProfile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveFile(userId: string, file: CloudFile): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;
    const path = `users/${userId}/files/${file.id}`;
    try {
      const safe = sanitizeFileForPersistence(file);
      const boundedPayload = stripUndefinedDeep(
        fitFilePayloadToFirestoreLimit({
          id: safe.id,
          name: safe.name,
          type: safe.type,
          sizeBytes: safe.sizeBytes,
          formattedSize: safe.formattedSize,
          date: safe.date,
          isFavorite: Boolean(safe.isFavorite),
          parentFolderId: safe.parentFolderId ?? null,
          url: safe.url || '',
          thumbnail: safe.thumbnail || '',
          itemCount: safe.itemCount ?? 0,
          content: safe.content || '',
          extension: safe.extension || '',
          archiveEntries: safe.archiveEntries || [],
          versions: safe.versions || [],
          mimeType: safe.mimeType || '',
          cloudChunkCount: safe.cloudChunkCount || 0,
          cloudSynced: Boolean(safe.cloudSynced),
          ownerId: userId,
          updatedAt: new Date().toISOString(),
        })
      );

      const mirrorPromise = fetch(`/api/cloud/files/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boundedPayload),
      }).catch(() => {});

      if (isFirestoreWriteQuotaCooldownActive()) {
        await mirrorPromise;
        return false;
      }

      await withFirestoreTimeout(
        setDoc(doc(db, 'users', userId, 'files', safe.id), boundedPayload, { merge: true }),
        10_000,
        'saveFile'
      );
      void mirrorPromise;
      return true;
    } catch (error) {
      if (isFirestoreHardQuotaError(error)) {
        markFirestoreWriteQuotaCooldown();
      }
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  /**
   * Checks quickly whether all expected chunks already exist in Firestore for a file.
   */
  async verifyCloudChunksExist(
    userId: string,
    fileId: string,
    expectedChunkCount?: number
  ): Promise<{ complete: boolean; totalChunks: number; missingIndices: number[] }> {
    if (!userId || userId === 'guest_user' || !fileId) {
      return { complete: false, totalChunks: 0, missingIndices: [] };
    }
    try {
      const q = query(
        collection(db, 'users', userId, 'file_chunks'),
        where('fileId', '==', fileId)
      );
      const snap = await getDocs(q);
      const present: CloudChunkRecord[] = [];
      let totalFromDoc = expectedChunkCount || 0;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.totalChunks === 'number' && d.totalChunks > totalFromDoc) {
          totalFromDoc = d.totalChunks;
        }
        if (typeof d.index === 'number' && typeof d.data === 'string' && d.data.length > 0) {
          present.push({ index: d.index, data: d.data });
        }
      });
      if (present.length === 0 || totalFromDoc <= 0) {
        return { complete: false, totalChunks: totalFromDoc, missingIndices: [] };
      }
      const missingIndices = getMissingChunkIndices(present, totalFromDoc);
      return {
        complete: missingIndices.length === 0,
        totalChunks: totalFromDoc,
        missingIndices,
      };
    } catch {
      return { complete: false, totalChunks: 0, missingIndices: [] };
    }
  },

  /**
   * Splits binary files (videos, audio, high-res photos, PDFs >340KB) into Base64 chunks
   * and uploads them with per-chunk retry and verified completion so every file plays across websites.
   */
  async saveFileChunks(
    userId: string,
    fileId: string,
    blob: Blob,
    mimeType?: string,
    fileName?: string,
    onProgress?: (uploadedChunks: number, totalChunks: number) => void,
    options?: { resumeMissing?: boolean }
  ): Promise<number> {
    if (!userId || userId === 'guest_user' || !fileId || !blob) return 0;
    if (!shouldChunkFileToCloud(blob.size)) return 0;
    if (isFirestoreWriteQuotaCooldownActive()) return 0;

    try {
      const buf = await blob.arrayBuffer();
      const chunks = splitBinaryIntoCloudChunks(new Uint8Array(buf));
      if (chunks.length === 0) return 0;

      const resolvedMime = inferMediaMimeType(fileName, mimeType || blob.type);
      let indicesToUpload = chunks.map((_, i) => i);

      if (options?.resumeMissing) {
        const existingCheck = await this.verifyCloudChunksExist(userId, fileId, chunks.length);
        if (existingCheck.complete && existingCheck.totalChunks === chunks.length) {
          onProgress?.(chunks.length, chunks.length);
          await withFirestoreTimeout(
            setDoc(
              doc(db, 'users', userId, 'files', fileId),
              {
                cloudChunkCount: chunks.length,
                cloudSynced: true,
                mimeType: resolvedMime,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            ),
            10_000,
            'markChunkSynced'
          );
          return chunks.length;
        }
        if (existingCheck.missingIndices.length > 0) {
          indicesToUpload = existingCheck.missingIndices;
        }
      }

      const writeChunkWithRetry = async (index: number, data: string): Promise<void> => {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (isFirestoreWriteQuotaCooldownActive()) {
            throw new Error('Firestore write quota cooldown active');
          }
          try {
            await withFirestoreTimeout(
              setDoc(
                doc(db, 'users', userId, 'file_chunks', buildChunkDocId(fileId, index)),
                {
                  fileId,
                  index,
                  totalChunks: chunks.length,
                  mimeType: resolvedMime,
                  data,
                }
              ),
              20_000,
              `saveChunk_${index}`
            );
            return;
          } catch (err) {
            lastErr = err;
            if (isFirestoreHardQuotaError(err)) {
              markFirestoreWriteQuotaCooldown();
              throw err;
            }
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          }
        }
        throw lastErr;
      };

      const batchSize = 3;
      let completed = chunks.length - indicesToUpload.length;
      if (completed > 0) {
        onProgress?.(completed, chunks.length);
      }

      for (let start = 0; start < indicesToUpload.length; start += batchSize) {
        const batchIndices = indicesToUpload.slice(start, start + batchSize);
        await Promise.all(
          batchIndices.map((idx) => writeChunkWithRetry(idx, chunks[idx]))
        );
        completed += batchIndices.length;
        onProgress?.(completed, chunks.length);
      }

      await withFirestoreTimeout(
        setDoc(
          doc(db, 'users', userId, 'files', fileId),
          {
            cloudChunkCount: chunks.length,
            cloudSynced: true,
            mimeType: resolvedMime,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        10_000,
        'markChunkSynced'
      );
      return chunks.length;
    } catch (error) {
      console.warn('Chunked cloud media upload warning:', error);
      return 0;
    }
  },

  /**
   * Downloads and reassembles chunked binary media from Firestore with retry, progress reporting,
   * server cache-bypass fallback, and completeness validation for cross-website video/audio/photo playback.
   */
  async getFileBlobFromCloudChunks(
    userId: string,
    fileId: string,
    expectedChunkCount?: number,
    expectedMimeType?: string,
    fileName?: string,
    onProgress?: (loadedChunks: number, totalChunks: number) => void
  ): Promise<Blob | null> {
    if (!userId || userId === 'guest_user' || !fileId || isFirestoreQuotaCooldownActive()) {
      return null;
    }

    const getDocWithRetry = async (idx: number) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const ref = doc(db, 'users', userId, 'file_chunks', buildChunkDocId(fileId, idx));
          let snap = await Promise.race([
            getDoc(ref),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Chunk read timeout')), 20_000)
            ),
          ]);
          if (!snap.exists()) {
            snap = await Promise.race([
              getDocFromServer(ref),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Chunk server read timeout')), 20_000)
              ),
            ]);
          }
          return snap;
        } catch (err) {
          if (isFirestoreHardQuotaError(err)) {
            markFirestoreQuotaCooldown();
            throw err;
          }
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
      return null;
    };

    try {
      const records: CloudChunkRecord[] = [];
      let detectedMime = expectedMimeType || '';
      let targetCount = expectedChunkCount || 0;

      // If caller didn't know expectedChunkCount, peek chunk 0 to learn totalChunks + mimeType
      if (!targetCount || targetCount <= 0) {
        try {
          const firstSnap = await getDocWithRetry(0);
          if (firstSnap && firstSnap.exists()) {
            const d = firstSnap.data();
            if (typeof d.totalChunks === 'number' && d.totalChunks > 0) {
              targetCount = d.totalChunks;
            }
            if (!detectedMime && typeof d.mimeType === 'string' && d.mimeType) {
              detectedMime = d.mimeType;
            }
            if (typeof d.data === 'string' && typeof d.index === 'number') {
              records.push({ index: d.index, data: d.data });
            }
          }
        } catch {
          // Fall through to query fallback below
        }
      }

      if (targetCount > 0) {
        const startIdx = records.some((r) => r.index === 0) ? 1 : 0;
        if (startIdx === 1) {
          onProgress?.(1, targetCount);
        }
        const remainingIndices = Array.from(
          { length: Math.max(0, targetCount - startIdx) },
          (_, i) => startIdx + i
        );
        const batchSize = 5;
        for (let start = 0; start < remainingIndices.length; start += batchSize) {
          const slice = remainingIndices.slice(start, start + batchSize);
          const docs = await Promise.all(slice.map((idx) => getDocWithRetry(idx)));
          for (const snap of docs) {
            if (snap && snap.exists()) {
              const d = snap.data();
              if (!detectedMime && typeof d.mimeType === 'string' && d.mimeType) {
                detectedMime = d.mimeType;
              }
              if (typeof d.totalChunks === 'number' && d.totalChunks > targetCount) {
                targetCount = d.totalChunks;
              }
              if (typeof d.data === 'string' && typeof d.index === 'number') {
                records.push({ index: d.index, data: d.data });
              }
            }
          }
          onProgress?.(records.length, targetCount);
        }
      }

      if (records.length === 0) {
        const q = query(
          collection(db, 'users', userId, 'file_chunks'),
          where('fileId', '==', fileId)
        );
        const snap = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Chunk query timeout')), 25_000)
          ),
        ]);
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!detectedMime && typeof d.mimeType === 'string' && d.mimeType) {
            detectedMime = d.mimeType;
          }
          if (typeof d.totalChunks === 'number' && d.totalChunks > targetCount) {
            targetCount = d.totalChunks;
          }
          if (typeof d.data === 'string' && typeof d.index === 'number') {
            records.push({ index: d.index, data: d.data });
          }
        });
        if (targetCount > 0) {
          onProgress?.(records.length, targetCount);
        }
      }

      if (records.length === 0) return null;
      if (targetCount > 0 && !areCloudChunksComplete(records, targetCount)) {
        console.warn(
          `Incomplete cloud chunks for ${fileId}: got ${records.length} of ${targetCount}`
        );
        return null;
      }

      const finalMime = inferMediaMimeType(fileName, detectedMime || expectedMimeType);
      return reassembleCloudChunksToBlob(records, finalMime);
    } catch (error) {
      if (isFirestoreHardQuotaError(error)) {
        markFirestoreQuotaCooldown();
      }
      console.warn('Error hydrating cloud file chunks:', error);
      return null;
    }
  },

  async deleteFileChunks(userId: string, fileId: string): Promise<void> {
    if (!userId || userId === 'guest_user' || !fileId) return;
    try {
      const q = query(
        collection(db, 'users', userId, 'file_chunks'),
        where('fileId', '==', fileId)
      );
      const snap = await getDocs(q);
      const deletes: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        deletes.push(deleteDoc(docSnap.ref));
      });
      if (deletes.length > 0) {
        await Promise.all(deletes);
      }
    } catch (err) {
      console.warn('Error deleting file chunks:', err);
    }
  },

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const path = `users/${userId}/files/${fileId}`;
    fetch(`/api/cloud/files/${encodeURIComponent(userId)}/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    fetch(`/api/media/${encodeURIComponent(userId)}/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    try {
      await withFirestoreTimeout(
        deleteDoc(doc(db, 'users', userId, 'files', fileId)),
        4000,
        'deleteFile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveDeletedFile(userId: string, file: CloudFile): Promise<void> {
    if (!userId || userId === 'guest_user') return;
    const path = `users/${userId}/recycle_bin/${file.id}`;
    try {
      const safe = sanitizeFileForPersistence(file);
      const boundedPayload = stripUndefinedDeep(
        fitFilePayloadToFirestoreLimit({
          name: safe.name,
          type: safe.type,
          sizeBytes: safe.sizeBytes,
          formattedSize: safe.formattedSize,
          date: safe.date,
          isFavorite: Boolean(safe.isFavorite),
          parentFolderId: safe.parentFolderId ?? null,
          url: safe.url || '',
          thumbnail: safe.thumbnail || '',
          itemCount: safe.itemCount ?? 0,
          content: safe.content || '',
          extension: safe.extension || '',
          archiveEntries: safe.archiveEntries || [],
          versions: safe.versions || [],
          mimeType: safe.mimeType || '',
          cloudChunkCount: safe.cloudChunkCount || 0,
          cloudSynced: Boolean(safe.cloudSynced),
          ownerId: userId,
          deletedAt: new Date().toISOString(),
        })
      );
      await withFirestoreTimeout(
        setDoc(doc(db, 'users', userId, 'recycle_bin', safe.id), boundedPayload, { merge: true }),
        4000,
        'saveDeletedFile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async removeDeletedFile(userId: string, fileId: string): Promise<void> {
    const path = `users/${userId}/recycle_bin/${fileId}`;
    try {
      await withFirestoreTimeout(
        deleteDoc(doc(db, 'users', userId, 'recycle_bin', fileId)),
        4000,
        'removeDeletedFile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getUserDeletedFiles(userId: string): Promise<CloudFile[]> {
    try {
      if (!userId) return [];
      const snap = await withFirestoreTimeout(
        getDocs(collection(db, 'users', userId, 'recycle_bin')),
        4000,
        'getUserDeletedFiles'
      );
      const list: CloudFile[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name,
          type: data.type,
          sizeBytes: data.sizeBytes || 0,
          formattedSize: data.formattedSize || '',
          date: data.date,
          isFavorite: Boolean(data.isFavorite),
          parentFolderId: data.parentFolderId ?? null,
          url: data.url || undefined,
          thumbnail: data.thumbnail || undefined,
          itemCount: data.itemCount,
          content: data.content || undefined,
          extension: data.extension || undefined,
          archiveEntries: data.archiveEntries,
          versions: data.versions,
          mimeType: data.mimeType || undefined,
          cloudChunkCount: data.cloudChunkCount || undefined,
          cloudSynced: data.cloudSynced !== undefined ? Boolean(data.cloudSynced) : undefined,
        });
      });
      return list;
    } catch {
      return [];
    }
  },

  async clearUserRecycleBin(userId: string): Promise<void> {
    try {
      const binSnap = await withFirestoreTimeout(
        getDocs(collection(db, 'users', userId, 'recycle_bin')),
        4000,
        'getRecycleBinForClear'
      );
      const deletePromises: Promise<void>[] = [];
      binSnap.forEach((binDoc) => {
        deletePromises.push(deleteDoc(binDoc.ref));
      });
      await withFirestoreTimeout(Promise.all(deletePromises), 4000, 'clearUserRecycleBin');
    } catch (error) {
      console.warn('Error clearing recycle bin:', error);
    }
  },

  async saveStorageUsage(userId: string, usage: StorageUsage): Promise<void> {
    const path = `users/${userId}/storage/usage`;
    try {
      await withFirestoreTimeout(
        setDoc(
          doc(db, 'users', userId, 'storage', 'usage'),
          {
            totalGB: usage.totalGB,
            usedGB: usage.usedGB,
            imagesGB: usage.imagesGB,
            imagesCount: usage.imagesCount,
            videosGB: usage.videosGB,
            videosCount: usage.videosCount,
            audiosMB: usage.audiosMB,
            audiosCount: usage.audiosCount,
            docsMB: usage.docsMB,
            docsCount: usage.docsCount,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        4000,
        'saveStorageUsage'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserFiles(userId: string, fallbackIds?: string[]): Promise<CloudFile[]> {
    try {
      if (!userId) return [];
      const userIdsToCheck = [userId, ...(fallbackIds || [])].filter(Boolean);
      const uniqueIds = Array.from(new Set(userIdsToCheck));

      const mapRawFile = (docId: string, data: Record<string, any>, fallbackOwner: string): CloudFile => ({
        id: docId,
        name: data.name,
        type: data.type,
        sizeBytes: data.sizeBytes || 0,
        formattedSize: data.formattedSize || '',
        date: data.date,
        isFavorite: Boolean(data.isFavorite),
        parentFolderId: data.parentFolderId ?? null,
        url: data.url || undefined,
        thumbnail: data.thumbnail || undefined,
        itemCount: data.itemCount,
        content: data.content || undefined,
        extension: data.extension || undefined,
        archiveEntries: data.archiveEntries,
        versions: data.versions,
        mimeType: data.mimeType || undefined,
        cloudChunkCount: data.cloudChunkCount || undefined,
        cloudSynced: data.cloudSynced !== undefined ? Boolean(data.cloudSynced) : undefined,
        ownerId: data.ownerId || fallbackOwner,
      });

      const mergedById = new Map<string, CloudFile>();
      await Promise.all(
        uniqueIds.map(async (id) => {
          const [firestoreRes, serverFiles] = await Promise.all([
            isFirestoreQuotaCooldownActive()
              ? Promise.resolve(null)
              : withFirestoreTimeout(
                  getDocs(collection(db, 'users', id, 'files')),
                  7500,
                  'getUserFiles'
                ).catch((err) => {
                  if (isFirestoreHardQuotaError(err)) {
                    markFirestoreQuotaCooldown();
                  }
                  return null;
                }),
            fetchServerCloudFiles(id),
          ]);

          if (firestoreRes && !firestoreRes.empty) {
            firestoreRes.forEach((docSnap) => {
              const mapped = mapRawFile(docSnap.id, docSnap.data(), id);
              const existing = mergedById.get(docSnap.id);
              mergedById.set(
                docSnap.id,
                existing
                  ? {
                      ...existing,
                      ...mapped,
                      cloudSynced: Boolean(existing.cloudSynced || mapped.cloudSynced),
                      cloudChunkCount: Math.max(
                        existing.cloudChunkCount || 0,
                        mapped.cloudChunkCount || 0
                      ) || undefined,
                    }
                  : mapped
              );
            });
          }

          for (const sf of serverFiles) {
            if (sf && sf.id) {
              const existing = mergedById.get(sf.id);
              mergedById.set(
                sf.id,
                existing
                  ? {
                      ...sf,
                      ...existing,
                      cloudSynced: Boolean(existing.cloudSynced || sf.cloudSynced),
                      cloudChunkCount: Math.max(
                        existing.cloudChunkCount || 0,
                        sf.cloudChunkCount || 0
                      ) || undefined,
                    }
                  : { ...sf, ownerId: sf.ownerId || id }
              );
            }
          }
        })
      );

      return Array.from(mergedById.values());
    } catch {
      return [];
    }
  },

  subscribeToFiles(
    userId: string,
    onData: (files: CloudFile[], meta?: { fromCache: boolean }) => void
  ): () => void {
    const path = `users/${userId}/files`;
    let unsubscribed = false;

    void fetchServerCloudFiles(userId).then((mirrorFiles) => {
      if (!unsubscribed && mirrorFiles.length > 0) {
        onData(mirrorFiles, { fromCache: true });
      }
    });

    const unsubSnapshot = onSnapshot(
      collection(db, 'users', userId, 'files'),
      (snapshot) => {
        const files: CloudFile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          files.push({
            id: docSnap.id,
            name: data.name,
            type: data.type,
            sizeBytes: data.sizeBytes || 0,
            formattedSize: data.formattedSize || '',
            date: data.date,
            isFavorite: Boolean(data.isFavorite),
            parentFolderId: data.parentFolderId ?? null,
            url: data.url || undefined,
            thumbnail: data.thumbnail || undefined,
            itemCount: data.itemCount,
            content: data.content || undefined,
            extension: data.extension || undefined,
            archiveEntries: data.archiveEntries,
            versions: data.versions,
            mimeType: data.mimeType || undefined,
            cloudChunkCount: data.cloudChunkCount || undefined,
            cloudSynced: data.cloudSynced !== undefined ? Boolean(data.cloudSynced) : undefined,
            ownerId: data.ownerId || userId,
          });
        });
        onData(files, { fromCache: snapshot.metadata.fromCache });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        void fetchServerCloudFiles(userId).then((mirrorFiles) => {
          if (!unsubscribed && mirrorFiles.length > 0) {
            onData(mirrorFiles, { fromCache: true });
          }
        });
      }
    );

    return () => {
      unsubscribed = true;
      unsubSnapshot();
    };
  },

  // ==========================================
  // 5. BASHAR CLOUD AI CHATS (PINNED & NAMED)
  // ==========================================

  async saveAiChat(userId: string, thread: AiChatThread): Promise<void> {
    if (!userId || userId === 'guest_user' || !thread?.id) return;
    const path = `users/${userId}/ai_chats/${thread.id}`;
    try {
      const trimmedMessages = (thread.messages || []).slice(-60).map((m) => ({
        id: m.id,
        role: m.role,
        text: (m.text || '').slice(0, 12000),
        createdAt: m.createdAt || Date.now(),
        mode: m.mode || thread.mode || 'general',
        modelUsed: m.modelUsed || '',
        attachment: m.attachment
          ? {
              id: m.attachment.id,
              name: m.attachment.name.slice(0, 160),
              snippet: (m.attachment.snippet || '').slice(0, 4000),
            }
          : null,
        isError: Boolean(m.isError),
      }));

      const boundedPayload = stripUndefinedDeep(
        fitFilePayloadToFirestoreLimit({
          id: thread.id,
          title: (thread.title || 'নতুন চ্যাট').slice(0, 120),
          pinned: Boolean(thread.pinned),
          pinnedAt: thread.pinnedAt ?? null,
          createdAt: thread.createdAt || Date.now(),
          updatedAt: thread.updatedAt || Date.now(),
          mode: thread.mode || 'general',
          messages: trimmedMessages,
          ownerId: userId,
        })
      );

      await withFirestoreTimeout(
        setDoc(doc(db, 'users', userId, 'ai_chats', thread.id), boundedPayload, { merge: true }),
        4000,
        'saveAiChat'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteAiChat(userId: string, chatId: string): Promise<void> {
    if (!userId || userId === 'guest_user' || !chatId) return;
    const path = `users/${userId}/ai_chats/${chatId}`;
    try {
      await withFirestoreTimeout(
        deleteDoc(doc(db, 'users', userId, 'ai_chats', chatId)),
        4000,
        'deleteAiChat'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeToAiChats(
    userId: string,
    onData: (threads: AiChatThread[]) => void
  ): () => void {
    const path = `users/${userId}/ai_chats`;
    return onSnapshot(
      collection(db, 'users', userId, 'ai_chats'),
      (snapshot) => {
        const list: AiChatThread[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            title: d.title || 'নতুন চ্যাট',
            pinned: Boolean(d.pinned),
            pinnedAt: d.pinnedAt ?? null,
            createdAt: d.createdAt || Date.now(),
            updatedAt: d.updatedAt || Date.now(),
            mode: d.mode || 'general',
            messages: Array.isArray(d.messages) ? d.messages : [],
          });
        });
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  // ==========================================
  // 6. ADMIN ANNOUNCEMENTS / ADVERTISEMENTS
  // ==========================================

  async saveAnnouncement(ad: AdminAnnouncement): Promise<void> {
    if (!ad?.id) return;
    const path = `announcements/${ad.id}`;
    try {
      const payload = stripUndefinedDeep({
        id: ad.id,
        title: (ad.title || '').slice(0, 180),
        message: (ad.message || '').slice(0, 2000),
        category: normalizeAnnouncementCategory(ad.category),
        imageUrl: sanitizeFirestoreMediaUrl(ad.imageUrl, 240_000),
        actionLabel: ad.actionLabel ? ad.actionLabel.slice(0, 80) : '',
        actionUrl: ad.actionUrl ? ad.actionUrl.slice(0, 500) : '',
        createdAt: ad.createdAt || '',
        createdTimestamp: Number(ad.createdTimestamp) || Date.now(),
        updatedAt: new Date().toISOString(),
      });
      await withFirestoreTimeout(
        setDoc(doc(db, 'announcements', ad.id), payload, { merge: true }),
        4000,
        'saveAnnouncement'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAnnouncements(): Promise<AdminAnnouncement[] | null> {
    const path = 'announcements';
    try {
      const snap = await withFirestoreTimeout(
        getDocs(collection(db, 'announcements')),
        4000,
        'getAnnouncements'
      );
      const list: AdminAnnouncement[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || '',
          message: d.message || '',
          category: normalizeAnnouncementCategory(d.category),
          imageUrl: d.imageUrl || undefined,
          actionLabel: d.actionLabel || undefined,
          actionUrl: d.actionUrl || undefined,
          createdAt: d.createdAt || '',
          createdTimestamp: Number(d.createdTimestamp) || 0,
        });
      });
      return sortAnnouncementsNewestFirst(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  subscribeToAnnouncements(
    onData: (list: AdminAnnouncement[], meta?: { fromCache: boolean }) => void
  ): () => void {
    const path = 'announcements';
    return onSnapshot(
      collection(db, 'announcements'),
      (snapshot) => {
        const list: AdminAnnouncement[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            title: d.title || '',
            message: d.message || '',
            category: normalizeAnnouncementCategory(d.category),
            imageUrl: d.imageUrl || undefined,
            actionLabel: d.actionLabel || undefined,
            actionUrl: d.actionUrl || undefined,
            createdAt: d.createdAt || '',
            createdTimestamp: Number(d.createdTimestamp) || 0,
          });
        });
        onData(sortAnnouncementsNewestFirst(list), {
          fromCache: snapshot.metadata.fromCache,
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  async deleteAnnouncement(adId: string): Promise<void> {
    if (!adId) return;
    const path = `announcements/${adId}`;
    try {
      await withFirestoreTimeout(
        deleteDoc(doc(db, 'announcements', adId)),
        4000,
        'deleteAnnouncement'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
