export type FileType = 'image' | 'video' | 'audio' | 'document' | 'folder' | 'archive';

export interface ArchiveEntry {
  name: string;
  size: string;
  sizeBytes?: number;
  isDir?: boolean;
}

export interface FileVersion {
  versionId: string;
  versionNumber: number;
  timestamp: string;
  sizeBytes: number;
  formattedSize: string;
  action: 'Created' | 'Modified' | 'Renamed' | 'Re-uploaded' | 'Restored';
  modifiedBy?: string;
  note?: string;
  name?: string;
}

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
  itemCount?: number; // for folders or archive entries
  content?: string; // Text content for user-created documents/notes
  extension?: string;
  archiveEntries?: ArchiveEntry[]; // Inspected entries inside zip files
  ownerId?: string;
  versions?: FileVersion[]; // File version history of uploads & modifications
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
  bkashNumber?: string;
  nagadNumber?: string;
  subscriptionFee?: number; // 100
}

export type PaymentStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'bkash' | 'nagad';

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  method: PaymentMethod;
  senderPhone: string;
  transactionId: string;
  amount: number; // 100 TK
  submittedAt: string;
  submittedTimestamp: number;
  status: PaymentStatus;
  adminNote?: string;
  reviewedAt?: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordPlain?: string;
  avatarUrl?: string;
  registeredAt: string;
  registeredTimestamp?: number;
  filesCount: number;
  storageUsedMB: number;
  isLifetimeApproved?: boolean;
  paymentStatus?: PaymentStatus;
  lastTrxId?: string;
}

export interface UserSubscription {
  registeredTimestamp: number;
  trialDays: number;
  isLifetimeApproved: boolean;
  paymentStatus: PaymentStatus;
  isExpired: boolean;
  daysRemaining: number;
}

export type MainTab = 'home' | 'ai' | 'files' | 'favourites' | 'me';

export type AiMode = 'general' | 'deep' | 'fast';

export type AiMessageRole = 'user' | 'model';

export interface AiAttachment {
  id: string;
  name: string;
  snippet: string;
}

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  text: string;
  createdAt: number;
  mode?: AiMode;
  modelUsed?: string;
  attachment?: AiAttachment;
  isError?: boolean;
}

export interface AiChatThread {
  id: string;
  title: string;
  pinned: boolean;
  pinnedAt?: number | null;
  createdAt: number;
  updatedAt: number;
  mode: AiMode;
  messages: AiMessage[];
}

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
  | 'admin-panel'
  | 'payment';
