import { RegisteredUser, CloudFile, UserProfile, StorageUsage } from '../types';

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
