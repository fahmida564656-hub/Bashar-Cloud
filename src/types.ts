export type FileType = 'image' | 'video' | 'audio' | 'document' | 'folder';

export interface CloudFile {
  id: string;
  name: string;
  type: FileType;
  sizeBytes: number;
  formattedSize: string;
  date: string;
  isFavorite: boolean;
  parentFolderId?: string | null;
  url?: string;
  thumbnail?: string;
  itemCount?: number; // for folders
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
}

export interface StorageUsage {
  totalGB: number;
  usedGB: number;
  imagesGB: number;
  imagesCount: number;
  videosGB: number;
  videosCount: number;
  audiosMB: number;
  audiosCount: number;
  docsMB: number;
  docsCount: number;
}

export interface SiteSettings {
  websiteName: string;
  logoUrl?: string;
  totalStorageGB: number;
  adminPassword: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordPlain?: string;
  avatarUrl?: string;
  registeredAt: string;
  filesCount: number;
  storageUsedMB: number;
}

export type MainTab = 'home' | 'files' | 'favourites' | 'me';

export type ScreenMode = 
  | 'main' 
  | 'welcome-email' 
  | 'welcome-phone' 
  | 'create-password'
  | 'search' 
  | 'notifications' 
  | 'edit-profile' 
  | 'app-settings'
  | 'recycle-bin'
  | 'storage-analysis'
  | 'admin-panel';

