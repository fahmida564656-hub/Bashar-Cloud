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
  | 'storage-analysis';
