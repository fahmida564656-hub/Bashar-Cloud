import { CloudFile, UserProfile, StorageUsage } from '../types';

export const initialUserProfile: UserProfile = {
  name: '',
  phone: '',
  email: '',
  avatarUrl: '',
};

export const initialStorageUsage: StorageUsage = {
  totalGB: 100,
  usedGB: 0,
  imagesGB: 0,
  imagesCount: 0,
  videosGB: 0,
  videosCount: 0,
  audiosMB: 0,
  audiosCount: 0,
  docsMB: 0,
  docsCount: 0,
};

// No demo files - clean storage by user instruction
export const initialFiles: CloudFile[] = [];
export const initialRecycleBin: CloudFile[] = [];
