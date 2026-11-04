import { CloudFile, UserProfile, StorageUsage } from '../types';
import { auth } from '../firebase/config';
import { firestoreService } from '../firebase/firestoreService';

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
  USER: 'gpcloud_user_v3_clean',
  USAGE: 'gpcloud_usage_v3_clean',
  SETTINGS: 'gpcloud_settings_v3_clean',
  LAST_SYNC: 'gpcloud_last_sync_v3_clean',
};

export const storageProviderMock = {
  /**
   * Save the full local metadata state into the mock storage provider persistence
   */
  saveMetadataState: (files: CloudFile[], user: UserProfile, storage: StorageUsage): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(storage));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (err) {
      console.warn('Storage provider mock save error:', err);
    }
  },

  /**
   * Load saved metadata state if available
   */
  loadMetadataState: (): {
    files: CloudFile[] | null;
    user: UserProfile | null;
    storage: StorageUsage | null;
    lastSync: string | null;
  } => {
    try {
      const filesStr = localStorage.getItem(STORAGE_KEYS.FILES);
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      const usageStr = localStorage.getItem(STORAGE_KEYS.USAGE);
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      return {
        files: filesStr ? JSON.parse(filesStr) : null,
        user: userStr ? JSON.parse(userStr) : null,
        storage: usageStr ? JSON.parse(usageStr) : null,
        lastSync: lastSync || null,
      };
    } catch (err) {
      console.warn('Storage provider mock load error:', err);
      return { files: null, user: null, storage: null, lastSync: null };
    }
  },

  /**
   * Simulated & live network synchronization call with cloud storage endpoint
   */
  syncWithProvider: async (
    files: CloudFile[],
    user: UserProfile,
    storage: StorageUsage
  ): Promise<StorageProviderSyncResult> => {
    // Save to local storage cache
    storageProviderMock.saveMetadataState(files, user, storage);

    let providerName = 'GP Cloud Firestore (asia-southeast1)';
    const currentUid = auth.currentUser?.uid;

    if (currentUid) {
      try {
        await firestoreService.saveUserProfile(currentUid, user);
        await firestoreService.saveStorageUsage(currentUid, storage);
        providerName = `Firebase Firestore (${auth.currentUser?.email || currentUid.slice(0, 8)})`;
      } catch (err) {
        console.warn('Firestore sync note:', err);
      }
    } else {
      // Simulate remote handshake
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      success: true,
      timestamp: timeFormatted,
      itemCount: files.length,
      totalBytes: Math.round(storage.usedGB * 1024 * 1024 * 1024),
      provider: providerName,
      latencyMs: Math.floor(Math.random() * 20) + 10,
    };
  },
};
