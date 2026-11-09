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
} from '../types';

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
          avatarUrl: user.avatarUrl || '',
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
  async getRegisteredUsers(): Promise<RegisteredUser[]> {
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
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  /**
   * Find a registered user in Firestore by phone or email in real-time
   * Guarantees login works even if user registered on another website.
   */
  async findRegisteredUser(identifier: string): Promise<RegisteredUser | null> {
    try {
      const cleanInput = identifier.replace(/[^0-9]/g, '').slice(-10);
      const isPhone = cleanInput.length >= 7;
      const lower = identifier.trim().toLowerCase();

      // First check all users to be 100% resilient
      const snapshot = await getDocs(collection(db, 'registered_users'));
      let found: RegisteredUser | null = null;

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const docPhone = (d.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const docCleanPhone = d.cleanPhone || docPhone;
        const docEmail = (d.email || '').toLowerCase();

        if (isPhone && (docPhone === cleanInput || docCleanPhone === cleanInput)) {
          found = {
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
          };
        } else if (!isPhone && (docEmail === lower || docSnap.id === lower)) {
          found = {
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
          };
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

  // ==========================================
  // 2. SITE SETTINGS (GLOBAL & CROSS-SITE)
  // ==========================================

  async saveSiteSettings(settings: SiteSettings): Promise<void> {
    const path = 'site_settings/global';
    try {
      await setDoc(doc(db, 'site_settings', 'global'), {
        websiteName: settings.websiteName,
        logoUrl: settings.logoUrl || '',
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

  async getPaymentRequests(): Promise<PaymentRequest[]> {
    try {
      const snapshot = await getDocs(collection(db, 'payment_requests'));
      const list: PaymentRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PaymentRequest);
      });
      return list;
    } catch {
      return [];
    }
  },

  subscribeToPaymentRequests(onData: (list: PaymentRequest[]) => void): () => void {
    return onSnapshot(
      collection(db, 'payment_requests'),
      (snapshot) => {
        const list: PaymentRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PaymentRequest);
        });
        onData(list);
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
          name: user.name,
          phone: user.phone || '',
          email: user.email,
          avatarUrl: user.avatarUrl || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveFile(userId: string, file: CloudFile): Promise<void> {
    const path = `users/${userId}/files/${file.id}`;
    try {
      await setDoc(
        doc(db, 'users', userId, 'files', file.id),
        {
          name: file.name,
          type: file.type,
          sizeBytes: file.sizeBytes,
          formattedSize: file.formattedSize,
          date: file.date,
          isFavorite: Boolean(file.isFavorite),
          parentFolderId: file.parentFolderId || null,
          url: file.url || '',
          itemCount: file.itemCount || 0,
          content: file.content || '',
          extension: file.extension || '',
          archiveEntries: file.archiveEntries || [],
          ownerId: userId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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

  async getUserFiles(userId: string): Promise<CloudFile[]> {
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'files'));
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
          parentFolderId: data.parentFolderId,
          url: data.url,
          itemCount: data.itemCount,
          content: data.content,
          extension: data.extension,
          archiveEntries: data.archiveEntries,
        });
      });
      return list;
    } catch {
      return [];
    }
  },

  subscribeToFiles(
    userId: string,
    onData: (files: CloudFile[]) => void
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
            parentFolderId: data.parentFolderId,
            url: data.url,
            itemCount: data.itemCount,
            content: data.content,
            extension: data.extension,
            archiveEntries: data.archiveEntries,
          });
        });
        if (files.length > 0) {
          onData(files);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },
};
