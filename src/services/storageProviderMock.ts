import { CloudFile, UserProfile, StorageUsage } from '../types';
import { auth } from '../firebase/config';
import { firestoreService } from '../firebase/firestoreService';
import { sanitizeFileForPersistence } from '../utils/fileVault';

export interface StorageProviderSyncResult {
  success: boolean;
  timestamp: string;
  itemCount: number;
  totalBytes: number;
  provider: string;
  latencyMs: number;
}

const STORAGE_KEYS = {
  FILES: 'gpcloud_files_v3_clean',
  RECYCLE_BIN: 'gpcloud_recycle_bin_v3_clean',
  USER: 'gpcloud_user_v3_clean',
  USAGE: 'gpcloud_usage_v3_clean',
  SETTINGS: 'gpcloud_settings_v3_clean',
  LAST_SYNC: 'gpcloud_last_sync_v3_clean',
};

function safeSetLocalStorageFiles(key: string, files: CloudFile[]): void {
  const sanitized = files.map((f) => sanitizeFileForPersistence(f));
  try {
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch {
    // Quota fallback: strip large base64 data URLs because full binary blobs stay in IndexedDB
    try {
      const compact = files.map((f) => sanitizeFileForPersistence(f, { stripLargeDataUrl: true }));
      localStorage.setItem(key, JSON.stringify(compact));
    } catch (innerErr) {
      console.warn('Storage provider compact save warning:', innerErr);
    }
  }
}

export const storageProviderMock = {
  /**
   * Save the full local metadata state into the storage provider persistence + per-user vault
   */
  saveMetadataState: (
    files: CloudFile[],
    user: UserProfile,
    storage: StorageUsage,
    recycleBin?: CloudFile[],
    userId?: string
  ): void => {
    try {
      safeSetLocalStorageFiles(STORAGE_KEYS.FILES, files);
      if (recycleBin !== undefined) {
        safeSetLocalStorageFiles(STORAGE_KEYS.RECYCLE_BIN, recycleBin);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(storage));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      if (userId && userId !== 'guest_user') {
        safeSetLocalStorageFiles(`${STORAGE_KEYS.FILES}_${userId}`, files);
        if (recycleBin !== undefined) {
          safeSetLocalStorageFiles(`${STORAGE_KEYS.RECYCLE_BIN}_${userId}`, recycleBin);
        }
        localStorage.setItem(`${STORAGE_KEYS.USAGE}_${userId}`, JSON.stringify(storage));
      }
    } catch (err) {
      console.warn('Storage provider save error:', err);
    }
  },

  /**
   * Load saved metadata state if available (optionally scoped to userId)
   */
  loadMetadataState: (userId?: string): {
    files: CloudFile[] | null;
    recycleBin: CloudFile[] | null;
    user: UserProfile | null;
    storage: StorageUsage | null;
    lastSync: string | null;
  } => {
    try {
      const scopedFilesKey = userId && userId !== 'guest_user' ? `${STORAGE_KEYS.FILES}_${userId}` : null;
      const scopedBinKey = userId && userId !== 'guest_user' ? `${STORAGE_KEYS.RECYCLE_BIN}_${userId}` : null;
      const scopedUsageKey = userId && userId !== 'guest_user' ? `${STORAGE_KEYS.USAGE}_${userId}` : null;

      const filesStr =
        (scopedFilesKey ? localStorage.getItem(scopedFilesKey) : null) ??
        (userId ? null : localStorage.getItem(STORAGE_KEYS.FILES));
      const binStr =
        (scopedBinKey ? localStorage.getItem(scopedBinKey) : null) ??
        (userId ? null : localStorage.getItem(STORAGE_KEYS.RECYCLE_BIN));
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      const usageStr =
        (scopedUsageKey ? localStorage.getItem(scopedUsageKey) : null) ??
        localStorage.getItem(STORAGE_KEYS.USAGE);
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      return {
        files: filesStr ? JSON.parse(filesStr) : null,
        recycleBin: binStr ? JSON.parse(binStr) : null,
        user: userStr ? JSON.parse(userStr) : null,
        storage: usageStr ? JSON.parse(usageStr) : null,
        lastSync: lastSync || null,
      };
    } catch (err) {
      console.warn('Storage provider load error:', err);
      return { files: null, recycleBin: null, user: null, storage: null, lastSync: null };
    }
  },

  /**
   * Clear all local vault keys for a given userId (e.g. when Admin wipes/deletes an account)
   */
  clearUserLocalVault: (userId: string): void => {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.FILES}_${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.RECYCLE_BIN}_${userId}`);
      localStorage.removeItem(`${STORAGE_KEYS.USAGE}_${userId}`);
    } catch {}
  },

  /**
   * Live synchronization call with Firestore & local cache
   */
  syncWithProvider: async (
    files: CloudFile[],
    user: UserProfile,
    storage: StorageUsage,
    recycleBin?: CloudFile[],
    userId?: string
  ): Promise<StorageProviderSyncResult> => {
    storageProviderMock.saveMetadataState(files, user, storage, recycleBin, userId);

    let providerName = 'Bashar Cloud Firestore (asia-southeast1)';
    const activeId = userId || auth.currentUser?.uid;

    if (activeId && activeId !== 'guest_user') {
      try {
        await firestoreService.saveUserProfile(activeId, user);
        await firestoreService.saveStorageUsage(activeId, storage);
        providerName = `Firebase Firestore (${auth.currentUser?.email || activeId.slice(0, 12)})`;
      } catch (err) {
        console.warn('Firestore sync note:', err);
      }
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      success: true,
      timestamp: timeFormatted,
      itemCount: files.length,
      totalBytes: Math.round(storage.usedGB * 1024 * 1024 * 1024),
      provider: providerName,
      latencyMs: 12,
    };
  },
};
