import { CloudFile, UserProfile, StorageUsage, SiteSettings } from '../types';

export const initialUserProfile: UserProfile = {
  name: '',
  phone: '',
  email: '',
  avatarUrl: '',
};

export const defaultSiteSettings: SiteSettings = {
  websiteName: 'Bashar Cloud',
  logoUrl: '/assets/aistudio/0a4ee58c-1d1d-4faa-8126-cfb8779227ba_f85ac4d0.png',
  totalStorageGB: 1000,
  adminPassword: 'Admin@Bashar2026!',
  bkashNumber: '01734211584',
  nagadNumber: '01734211584',
  subscriptionFee: 100, // 100 Taka for lifetime access
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
