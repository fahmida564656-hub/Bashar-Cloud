import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';
import { CloudFile, UserProfile, StorageUsage } from '../types';

export const firestoreService = {
  /**
   * Save or update user profile in Firestore
   */
  async saveUserProfile(userId: string, user: UserProfile): Promise<void> {
    const path = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), {
        name: user.name,
        phone: user.phone || '',
        email: user.email,
        avatarUrl: user.avatarUrl || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Save or update a single file in user's files subcollection
   */
  async saveFile(userId: string, file: CloudFile): Promise<void> {
    const path = `users/${userId}/files/${file.id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'files', file.id), {
        name: file.name,
        type: file.type,
        sizeBytes: file.sizeBytes,
        formattedSize: file.formattedSize,
        date: file.date,
        isFavorite: Boolean(file.isFavorite),
        parentFolderId: file.parentFolderId || null,
        url: file.url || '',
        itemCount: file.itemCount || 0,
        ownerId: userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Delete a file from user's files subcollection
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    const path = `users/${userId}/files/${fileId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'files', fileId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Save storage usage breakdown
   */
  async saveStorageUsage(userId: string, usage: StorageUsage): Promise<void> {
    const path = `users/${userId}/storage/usage`;
    try {
      await setDoc(doc(db, 'users', userId, 'storage', 'usage'), {
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
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Sync all initial files to Firestore in batch if user has no files yet
   */
  async syncInitialFiles(userId: string, files: CloudFile[]): Promise<void> {
    const path = `users/${userId}/files`;
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'files'));
      if (snap.empty) {
        for (const file of files) {
          await this.saveFile(userId, file);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  /**
   * Subscribe to real-time updates for user's files
   */
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
