import { CloudFile, UserProfile, StorageUsage, SiteSettings } from '../types';

export const initialUserProfile: UserProfile = {
  name: '',
  phone: '',
  email: '',
  avatarUrl: '',
};

export const defaultSiteSettings: SiteSettings = {
  websiteName: 'Bashar Cloud',
  logoUrl: '',
  totalStorageGB: 1000,
  adminPassword: 'Admin@Bashar2026!',
};

export const initialStorageUsage: StorageUsage = {
  totalGB: 1000,
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
