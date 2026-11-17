import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';
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
  doesPaymentBelongToUser,
  PaymentOwnerTarget,
} from '../utils/accountManagement';
import {
  buildChunkDocId,
  CloudChunkRecord,
  reassembleCloudChunksToBlob,
  shouldChunkFileToCloud,
  splitBinaryIntoCloudChunks,
} from '../utils/cloudChunkSync';

export const firestoreService = {
  // ==========================================
  // 1. REGISTERED USERS (CROSS-SITE & GLOBAL)
  // ==========================================

  /**
   * Save or update registered user credentials in Firestore
   * Ensures instant sync across all websites, domains, and devices.
   */
  async saveRegisteredUser(user: RegisteredUser): Promise<void> {
    const path = `registered_users/${user.id}`;
    try {
      const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const cleanEmail = (user.email || '').trim().toLowerCase();

      await setDoc(
        doc(db, 'registered_users', user.id),
        {
          id: user.id,
          name: user.name,
          email: cleanEmail,
          phone: user.phone || '',
          cleanPhone,
          passwordPlain: user.passwordPlain || '',
          avatarUrl: sanitizeFirestoreMediaUrl(user.avatarUrl, 180_000),
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Fetch all registered users from Firestore
   */
  async getRegisteredUsersWithMeta(): Promise<{ users: RegisteredUser[]; fromCache: boolean } | null> {
    const path = 'registered_users';
    try {
      const snapshot = await getDocs(collection(db, 'registered_users'));
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
      return null;
    }
  },

  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    const result = await this.getRegisteredUsersWithMeta();
    return result ? result.users : [];
  },

  /**
   * Find a registered user in Firestore by phone, email, or user ID in real-time
   * Guarantees login works seamlessly even if user registered on another website or domain.
   */
  async findRegisteredUser(identifier: string): Promise<RegisteredUser | null> {
    try {
      if (!identifier) return null;
      const trimmed = identifier.trim();
      const lower = trimmed.toLowerCase();
      const cleanDigits = trimmed.replace(/[^0-9]/g, '').slice(-10);

      // Fetch all registered users to guarantee resilient matching without index errors
      const snapshot = await getDocs(collection(db, 'registered_users'));
      let found: RegisteredUser | null = null;

      snapshot.forEach((docSnap) => {
        if (found) return;
        const d = docSnap.data();
        const docPhone = (d.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const docCleanPhone = (d.cleanPhone || docPhone).replace(/[^0-9]/g, '').slice(-10);
        const docEmail = (d.email || '').trim().toLowerCase();
        const docId = docSnap.id;

        // 1. Direct ID match
        if (docId === trimmed || d.id === trimmed) {
          found = {
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
          };
          return;
        }

        // 2. Email match (if input has @ or matches email exactly)
        if (docEmail && (trimmed.includes('@') ? docEmail === lower : docEmail === lower)) {
          found = {
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
          };
          return;
        }

        // 3. Phone number match (10 or 11 digits)
        if (cleanDigits.length >= 7 && (docCleanPhone === cleanDigits || docPhone === cleanDigits)) {
          found = {
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
          };
          return;
        }

        // 4. Exact Name match fallback
        if (d.name && d.name.trim().toLowerCase() === lower) {
          found = {
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
          };
          return;
        }
      });

      return found;
    } catch (error) {
      console.warn('findRegisteredUser cloud query error:', error);
      return null;
    }
  },

  /**
   * Subscribe to real-time registered users list updates from Firestore
   */
  subscribeToRegisteredUsers(
    onData: (users: RegisteredUser[]) => void
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
        onData(users);
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
    try {
      await deleteDoc(doc(db, 'registered_users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Delete every payment_request document belonging to a user (matched by id, email, or phone)
   */
  async deleteUserPaymentRequests(target: PaymentOwnerTarget): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'payment_requests'));
      const payDeletes: Promise<void>[] = [];
      snap.forEach((pDoc) => {
        const data = pDoc.data() as PaymentRequest;
        if (doesPaymentBelongToUser({ ...data, id: data.id || pDoc.id }, target)) {
          payDeletes.push(deleteDoc(pDoc.ref));
        }
      });
      if (payDeletes.length > 0) {
        await Promise.all(payDeletes);
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
      const snap = await getDocs(collection(db, 'payment_requests'));
      const deletes: Promise<void>[] = [];
      snap.forEach((pDoc) => {
        deletes.push(deleteDoc(pDoc.ref));
      });
      if (deletes.length > 0) {
        await Promise.all(deletes);
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

      await Promise.all([
        deleteDoc(doc(db, 'registered_users', userId)),
        subcollectionCleanup(),
        deleteDoc(doc(db, 'users', userId, 'storage', 'usage')).catch(() => {}),
        deleteDoc(doc(db, 'users', userId)).catch(() => {}),
        this.deleteUserPaymentRequests({
          id: userId,
          email: targetEmail,
          phone: targetPhone,
        }),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Clear all files (and recycle bin) for a specific user in Firestore
   */
  async clearAllUserFiles(userId: string): Promise<void> {
    try {
      const [filesSnap, binSnap, chunksSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'files')),
        getDocs(collection(db, 'users', userId, 'recycle_bin')),
        getDocs(collection(db, 'users', userId, 'file_chunks')),
      ]);
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
      await setDoc(doc(db, 'site_settings', 'global'), {
        websiteName: settings.websiteName,
        logoUrl: sanitizeFirestoreMediaUrl(settings.logoUrl, 240_000),
        totalStorageGB: settings.totalStorageGB || 1000,
        bkashNumber: settings.bkashNumber || '01734211584',
        nagadNumber: settings.nagadNumber || '01734211584',
        subscriptionFee: settings.subscriptionFee || 100,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getSiteSettings(): Promise<Partial<SiteSettings> | null> {
    try {
      const snap = await getDoc(doc(db, 'site_settings', 'global'));
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
      await setDoc(
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
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPaymentRequestsWithMeta(): Promise<{ payments: PaymentRequest[]; fromCache: boolean } | null> {
    try {
      const snapshot = await getDocs(collection(db, 'payment_requests'));
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

  // ==========================================
  // 4. USER PROFILES & FILES
  // ==========================================

  async saveUserProfile(userId: string, user: UserProfile): Promise<void> {
    const path = `users/${userId}`;
    try {
      await setDoc(
        doc(db, 'users', userId),
        {
          name: (user.name || '').slice(0, 200),
          phone: (user.phone || '').slice(0, 60),
          email: (user.email || '').slice(0, 200),
          avatarUrl: sanitizeFirestoreMediaUrl(user.avatarUrl, 180_000),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveFile(userId: string, file: CloudFile): Promise<void> {
    if (!userId || userId === 'guest_user') return;
    const path = `users/${userId}/files/${file.id}`;
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
          ownerId: userId,
          updatedAt: new Date().toISOString(),
        })
      );
      await setDoc(doc(db, 'users', userId, 'files', safe.id), boundedPayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Splits large binary files (videos, audio, high-res photos, PDFs >340KB) into Base64 chunks
   * and uploads them in parallel batches so any logged-in device/website can stream/view them seamlessly.
   */
  async saveFileChunks(
    userId: string,
    fileId: string,
    blob: Blob,
    mimeType?: string
  ): Promise<number> {
    if (!userId || userId === 'guest_user' || !fileId || !blob) return 0;
    if (!shouldChunkFileToCloud(blob.size)) return 0;

    try {
      const buf = await blob.arrayBuffer();
      const chunks = splitBinaryIntoCloudChunks(new Uint8Array(buf));
      if (chunks.length === 0) return 0;

      const resolvedMime = mimeType || blob.type || 'application/octet-stream';
      const batchSize = 4;
      for (let start = 0; start < chunks.length; start += batchSize) {
        const batch = chunks.slice(start, start + batchSize);
        await Promise.all(
          batch.map((data, offsetIdx) => {
            const index = start + offsetIdx;
            return setDoc(
              doc(db, 'users', userId, 'file_chunks', buildChunkDocId(fileId, index)),
              {
                fileId,
                index,
                totalChunks: chunks.length,
                mimeType: resolvedMime,
                data,
              }
            );
          })
        );
      }

      await setDoc(
        doc(db, 'users', userId, 'files', fileId),
        {
          cloudChunkCount: chunks.length,
          mimeType: resolvedMime,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return chunks.length;
    } catch (error) {
      console.warn('Chunked cloud media upload warning:', error);
      return 0;
    }
  },

  /**
   * Downloads and reassembles chunked binary media from Firestore for cross-website video/audio/file playback.
   */
  async getFileBlobFromCloudChunks(
    userId: string,
    fileId: string,
    expectedChunkCount?: number,
    expectedMimeType?: string
  ): Promise<Blob | null> {
    if (!userId || userId === 'guest_user' || !fileId) return null;

    try {
      const records: CloudChunkRecord[] = [];
      let detectedMime = expectedMimeType || '';

      if (expectedChunkCount && expectedChunkCount > 0) {
        const indices = Array.from({ length: expectedChunkCount }, (_, i) => i);
        const batchSize = 6;
        for (let start = 0; start < indices.length; start += batchSize) {
          const slice = indices.slice(start, start + batchSize);
          const docs = await Promise.all(
            slice.map((idx) =>
              getDoc(doc(db, 'users', userId, 'file_chunks', buildChunkDocId(fileId, idx)))
            )
          );
          for (const snap of docs) {
            if (snap.exists()) {
              const d = snap.data();
              if (!detectedMime && typeof d.mimeType === 'string' && d.mimeType) {
                detectedMime = d.mimeType;
              }
              if (typeof d.data === 'string' && typeof d.index === 'number') {
                records.push({ index: d.index, data: d.data });
              }
            }
          }
        }
      }

      if (records.length === 0) {
        const q = query(
          collection(db, 'users', userId, 'file_chunks'),
          where('fileId', '==', fileId)
        );
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!detectedMime && typeof d.mimeType === 'string' && d.mimeType) {
            detectedMime = d.mimeType;
          }
          if (typeof d.data === 'string' && typeof d.index === 'number') {
            records.push({ index: d.index, data: d.data });
          }
        });
      }

      if (records.length === 0) return null;
      return reassembleCloudChunksToBlob(records, detectedMime || 'application/octet-stream');
    } catch (error) {
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
    try {
      await deleteDoc(doc(db, 'users', userId, 'files', fileId));
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
          ownerId: userId,
          deletedAt: new Date().toISOString(),
        })
      );
      await setDoc(doc(db, 'users', userId, 'recycle_bin', safe.id), boundedPayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async removeDeletedFile(userId: string, fileId: string): Promise<void> {
    const path = `users/${userId}/recycle_bin/${fileId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'recycle_bin', fileId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getUserDeletedFiles(userId: string): Promise<CloudFile[]> {
    try {
      if (!userId) return [];
      const snap = await getDocs(collection(db, 'users', userId, 'recycle_bin'));
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
        });
      });
      return list;
    } catch {
      return [];
    }
  },

  async clearUserRecycleBin(userId: string): Promise<void> {
    try {
      const binSnap = await getDocs(collection(db, 'users', userId, 'recycle_bin'));
      const deletePromises: Promise<void>[] = [];
      binSnap.forEach((binDoc) => {
        deletePromises.push(deleteDoc(binDoc.ref));
      });
      await Promise.all(deletePromises);
    } catch (error) {
      console.warn('Error clearing recycle bin:', error);
    }
  },

  async saveStorageUsage(userId: string, usage: StorageUsage): Promise<void> {
    const path = `users/${userId}/storage/usage`;
    try {
      await setDoc(
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

      for (const id of uniqueIds) {
        const snap = await getDocs(collection(db, 'users', id, 'files'));
        if (!snap.empty) {
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
            });
          });
          if (list.length > 0) {
            return list;
          }
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  subscribeToFiles(
    userId: string,
    onData: (files: CloudFile[], meta?: { fromCache: boolean }) => void
  ): () => void {
    const path = `users/${userId}/files`;
    return onSnapshot(
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
          });
        });
        onData(files, { fromCache: snapshot.metadata.fromCache });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
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

      await setDoc(doc(db, 'users', userId, 'ai_chats', thread.id), boundedPayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteAiChat(userId: string, chatId: string): Promise<void> {
    if (!userId || userId === 'guest_user' || !chatId) return;
    const path = `users/${userId}/ai_chats/${chatId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'ai_chats', chatId));
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
      await setDoc(doc(db, 'announcements', ad.id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAnnouncements(): Promise<AdminAnnouncement[] | null> {
    const path = 'announcements';
    try {
      const snap = await getDocs(collection(db, 'announcements'));
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
      await deleteDoc(doc(db, 'announcements', adId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
