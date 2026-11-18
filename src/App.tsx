/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PhoneContainer } from './components/PhoneContainer';
import { WelcomeScreen } from './components/AuthScreens';
import { HomeScreen } from './components/HomeScreen';
import { FilesScreen } from './components/FilesScreen';
import { FavouritesScreen } from './components/FavouritesScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { EditProfileScreen } from './components/EditProfileScreen';
import { AppSettingsScreen } from './components/AppSettingsScreen';
import { SearchScreen } from './components/SearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { StorageAnalysisScreen } from './components/StorageAnalysisScreen';
import { AdminPanelScreen } from './components/AdminPanelScreen';
import { PaymentScreen } from './components/PaymentScreen';
import { FilePreviewModal } from './components/FilePreviewModal';
import { BottomNavBar } from './components/BottomNavBar';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { UploadFlowModal } from './components/UploadFlowModal';
import { BasharAiScreen } from './components/BasharAiScreen';
import { AppTheme, getSavedTheme, applyTheme } from './utils/theme';
import {
  OrbitThemePresetId,
  getSavedOrbitTheme,
  applyOrbitTheme,
  getOrbitThemePresetById,
} from './utils/orbitTheme';
import JSZip from 'jszip';
import {
  RecycleBinModal,
  AudioPlayerModal,
  NewFolderModal,
  CreateFileModal,
  RenameFileModal,
  ZipArchiveModal,
} from './components/Modals';
import {
  initialUserProfile,
  initialStorageUsage,
  initialFiles,
  initialRecycleBin,
  defaultSiteSettings,
} from './data/initialData';
import { storageProviderMock } from './services/storageProviderMock';
import { testFirestoreConnection, auth } from './firebase/config';
import { firestoreService } from './firebase/firestoreService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  calculateSubscription,
  loadTrialStartTimestamp,
  saveTrialStartTimestamp,
} from './utils/subscription';
import { appendFileVersion, createInitialVersion } from './utils/fileVersioning';
import {
  buildCloudFileFromBrowserFile,
  compressImageToSafeDataUrl,
  hydrateCloudFiles,
  mergeCloudAndLocalFiles,
  computeStorageBreakdown,
  saveFileBlob,
  getFileBlob,
  deleteFileBlob,
  clearAllFileBlobs,
  copyFileBlob,
  loadDeletedFileIds,
  addDeletedFileIds,
  removeDeletedFileIds,
  clearDeletedFileIds,
} from './utils/fileVault';
import {
  buildDeterministicAccountId,
  collectCandidateOwnerIds,
  filterOutUserPayments,
  findMatchingUserRecords,
  mergeRegisteredUserRecords,
} from './utils/accountManagement';
import { isFirestoreQuotaCooldownActive } from './firebase/errorHandler';
import { formatBytes } from './utils/uploadFlow';
import {
  shouldChunkFileToCloud,
  needsCloudChunkUpload,
  inferMediaMimeType,
  INLINE_CLOUD_FILE_THRESHOLD_BYTES,
  MAX_CLOUD_CHUNK_FILE_BYTES,
} from './utils/cloudChunkSync';
import {
  createAiThread,
  sortAiThreads,
  togglePinAiThread,
  renameAiThread,
  deleteAiThread,
  setThreadMode,
  appendMessageToThread,
  updateMessageInThread,
  mergeAiThreads,
  loadAiThreadsFromStorage,
  saveAiThreadsToStorage,
  clearAiThreadsFromStorage,
} from './utils/aiChats';
import { parseSseChunks } from './utils/aiServerHelpers';
import {
  getUnreadAnnouncementCount,
  loadAnnouncementsFromStorage,
  loadLastReadNotificationTs,
  saveAnnouncementsToStorage,
  saveLastReadNotificationTs,
  sortAnnouncementsNewestFirst,
} from './utils/announcements';
import {
  clearRecentSearches,
  getRecentSearchesStorageKey,
} from './utils/recentSearches';
import {
  MainTab,
  ScreenMode,
  CloudFile,
  FileVersion,
  UserProfile,
  StorageUsage,
  FileType,
  SiteSettings,
  RegisteredUser,
  PaymentRequest,
  PaymentStatus,
  AiChatThread,
  AiMode,
  AiAttachment,
  AiMessage,
  AdminAnnouncement,
} from './types';

export default function App() {
  const savedState = storageProviderMock.loadMetadataState();
  const hasExistingUser = !!(savedState.user && (savedState.user.name || savedState.user.email));

  // Site Settings (Default: Bashar Cloud, 1000 GB, bKash & Nagad numbers: 01734211584, uploaded logo)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSiteSettings,
          ...parsed,
          adminPassword: (!parsed.adminPassword || parsed.adminPassword === 'Admin@Bashar2026!') ? 'Fahmida3421' : parsed.adminPassword,
          logoUrl: parsed.logoUrl || defaultSiteSettings.logoUrl,
          bkashNumber: parsed.bkashNumber || '01734211584',
          nagadNumber: (!parsed.nagadNumber || parsed.nagadNumber === '01812345678') ? '01734211584' : parsed.nagadNumber,
        };
      }
    } catch {}
    return defaultSiteSettings;
  });

  // Registered Users (Persisted in localStorage & Firestore, with viewable passwords for Admin)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Payment Requests (Persisted in localStorage)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_payment_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Admin Advertisements / Notifications (Persisted in localStorage + Firestore)
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(() =>
    loadAnnouncementsFromStorage()
  );
  const [lastReadNotificationTs, setLastReadNotificationTs] = useState<number>(() =>
    loadLastReadNotificationTs()
  );

  // Live clock tick so daily 30-day trial countdown updates automatically
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Modern Light / Dark Theme state with persistent localStorage
  const [theme, setTheme] = useState<AppTheme>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Rotating Perimeter Glow Color Preset (1..5, persistent in localStorage)
  const [orbitPreset, setOrbitPreset] = useState<OrbitThemePresetId>(() => getSavedOrbitTheme());

  useEffect(() => {
    applyOrbitTheme(orbitPreset);
  }, [orbitPreset]);

  const handleChangeOrbitPreset = (presetId: OrbitThemePresetId, showFeedback = true) => {
    setOrbitPreset(presetId);
    applyOrbitTheme(presetId, canonicalUserId);
    if (showFeedback) {
      const preset = getOrbitThemePresetById(presetId);
      setSyncToast(`বর্ডার কালার #${preset.numberLabel} (${preset.bnName}) সেট হয়েছে!`);
      setTimeout(() => setSyncToast(null), 2200);
    }
  };

  // Screen and Tab state - starts on Welcome / Sign In / Sign Up
  const [screen, setScreen] = useState<ScreenMode>(hasExistingUser ? 'main' : 'welcome-email');
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [initialFilesFilter, setInitialFilesFilter] = useState<string>('all');
  const [initialFilesFolderId, setInitialFilesFolderId] = useState<string | null>(null);

  // User, Storage & Files state - starts with clean 0 B / 1000 GB, zero sample files
  const [user, setUser] = useState<UserProfile>(
    hasExistingUser ? savedState.user! : initialUserProfile
  );
  const [storage, setStorage] = useState<StorageUsage>(() => {
    const base = savedState.storage || initialStorageUsage;
    return { ...base, totalGB: siteSettings.totalStorageGB || 1000 };
  });
  const [files, setFiles] = useState<CloudFile[]>(
    Array.isArray(savedState.files) ? savedState.files : initialFiles
  );
  const [recycleBin, setRecycleBin] = useState<CloudFile[]>(
    Array.isArray(savedState.recycleBin) ? savedState.recycleBin : initialRecycleBin
  );

  const filesRef = useRef<CloudFile[]>(files);
  const recycleBinRef = useRef<CloudFile[]>(recycleBin);
  const sessionAuthenticatedRef = useRef<boolean>(false);
  const userAbortedAiRef = useRef<boolean>(false);
  const mediaResolvingRef = useRef<Map<string, Promise<string | undefined>>>(new Map());
  const liveObjectUrlsRef = useRef<Map<string, string>>(new Map());
  const chunkUploadingIdsRef = useRef<Set<string>>(new Set());
  const foregroundMediaIdsRef = useRef<Set<string>>(new Set());
  filesRef.current = files;
  recycleBinRef.current = recycleBin;

  // Cloud Synchronization state
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(true);
  const [hasRemoteUsers, setHasRemoteUsers] = useState<boolean>(false);
  const [extraOwnerIds, setExtraOwnerIds] = useState<string[]>([]);
  const lastSyncedMetaRef = useRef<{ uid: string; filesCount: number; usedMB: number } | null>(null);
  const syncedAccountOnSessionRef = useRef<Set<string>>(new Set());
  const confirmedServerAccountRef = useRef<Set<string>>(new Set());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    savedState.lastSync
      ? new Date(savedState.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Just now'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // View state
  const [isFabOpen, setIsFabOpen] = useState<boolean>(false);
  const [isFilesBulkActive, setIsFilesBulkActive] = useState<boolean>(false);

  // Modals state
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState<boolean>(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<CloudFile | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState<boolean>(false);
  const [isCreateFileOpen, setIsCreateFileOpen] = useState<boolean>(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState<boolean>(false);
  const [selectedZipFile, setSelectedZipFile] = useState<CloudFile | null>(null);
  const [fileToRename, setFileToRename] = useState<CloudFile | null>(null);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [isUploadFlowOpen, setIsUploadFlowOpen] = useState<boolean>(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);

  // Bashar Cloud AI chats state (pinned + renamed conversations persisted locally & in Firestore)
  const [aiThreads, setAiThreads] = useState<AiChatThread[]>(() => {
    const initialId =
      savedState.user?.email
        ? savedState.user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
        : 'guest_user';
    const loaded = loadAiThreadsFromStorage(initialId);
    return loaded.length > 0 ? loaded : [createAiThread()];
  });
  const [activeAiThreadId, setActiveAiThreadId] = useState<string>('');
  const [isAiStreaming, setIsAiStreaming] = useState<boolean>(false);
  const [streamingThreadId, setStreamingThreadId] = useState<string | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const aiThreadsRef = useRef<AiChatThread[]>(aiThreads);
  aiThreadsRef.current = aiThreads;
  const isAiStreamingRef = useRef<boolean>(false);
  isAiStreamingRef.current = isAiStreaming;
  const aiAbortRef = useRef<AbortController | null>(null);

  // Helper to clean phone numbers
  const cleanPhone = (p?: string) => (p || '').replace(/[^0-9]/g, '').slice(-10);

  // Find active registered user records (consolidated across websites) & deterministic canonical ID
  const matchedUserRecords = findMatchingUserRecords(registeredUsers, {
    email: user.email,
    phone: user.phone,
  });
  const currentUserRecord =
    matchedUserRecords.length > 0
      ? matchedUserRecords.reduce((acc, rec) => mergeRegisteredUserRecords(acc, rec))
      : undefined;

  const canonicalUserId =
    currentUserRecord?.id ||
    (user.email || cleanPhone(user.phone)
      ? buildDeterministicAccountId(user.email, user.phone)
      : 'guest_user');

  const getCandidateOwnerIds = (overrideUid?: string): string[] =>
    collectCandidateOwnerIds({
      canonicalUserId,
      matchedRecords: matchedUserRecords,
      email: user.email,
      phone: user.phone,
      extraIds: overrideUid ? [...extraOwnerIds, overrideUid] : extraOwnerIds,
    });

  const patchResolvedFileUrl = (fileId: string, resolvedUrl: string) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === fileId ? { ...item, url: resolvedUrl } : item))
    );
    setPreviewFile((prev) =>
      prev && prev.id === fileId ? { ...prev, url: resolvedUrl } : prev
    );
    setSelectedAudioFile((prev) =>
      prev && prev.id === fileId ? { ...prev, url: resolvedUrl } : prev
    );
  };

  const ensurePlayableBlob = (blob: Blob, file: CloudFile): Blob => {
    const playableMime = inferMediaMimeType(file.name, blob.type || file.mimeType);
    if (!playableMime || blob.type === playableMime) return blob;
    return new Blob([blob], { type: playableMime });
  };

  const resolveCloudMediaUrl = async (
    targetFile: CloudFile,
    overrideUid?: string,
    options?: { priority?: boolean; onProgress?: (percent: number) => void }
  ): Promise<string | undefined> => {
    if (!targetFile || targetFile.type === 'folder') return undefined;

    const isThumbnailOnlyImage =
      targetFile.type === 'image' &&
      Boolean(targetFile.thumbnail) &&
      targetFile.url === targetFile.thumbnail &&
      (targetFile.cloudChunkCount || 0) > 0;

    const cachedLive = liveObjectUrlsRef.current.get(targetFile.id);
    if (cachedLive) {
      if (!targetFile.url || targetFile.url !== cachedLive) {
        patchResolvedFileUrl(targetFile.id, cachedLive);
      }
      options?.onProgress?.(100);
      return cachedLive;
    }

    if (
      targetFile.url &&
      (targetFile.url.startsWith('data:') || targetFile.url.startsWith('http')) &&
      !(options?.priority && isThumbnailOnlyImage)
    ) {
      options?.onProgress?.(100);
      return targetFile.url;
    }

    if (options?.priority) {
      foregroundMediaIdsRef.current.add(targetFile.id);
    }

    const inFlight = mediaResolvingRef.current.get(targetFile.id);
    if (inFlight) {
      try {
        return await inFlight;
      } finally {
        if (options?.priority) {
          foregroundMediaIdsRef.current.delete(targetFile.id);
        }
      }
    }

    const resolvePromise = (async (): Promise<string | undefined> => {
      try {
        const localBlob = await getFileBlob(targetFile.id);
        if (localBlob && localBlob.size > 0) {
          const playable = ensurePlayableBlob(localBlob, targetFile);
          const objUrl = URL.createObjectURL(playable);
          liveObjectUrlsRef.current.set(targetFile.id, objUrl);
          patchResolvedFileUrl(targetFile.id, objUrl);
          options?.onProgress?.(100);
          return objUrl;
        }

        const candidateUids = getCandidateOwnerIds(overrideUid || targetFile.ownerId);
        // 1. Fast binary server transport (/api/media) - zero Firestore quota burn
        for (const uid of candidateUids) {
          const serverBlob = await firestoreService.fetchMediaBlobFromServer(
            uid,
            targetFile.id,
            targetFile.name,
            targetFile.mimeType
          );
          if (serverBlob && serverBlob.size > 0) {
            const playable = ensurePlayableBlob(serverBlob, targetFile);
            await saveFileBlob(targetFile.id, playable).catch(() => {});
            const objUrl = URL.createObjectURL(playable);
            liveObjectUrlsRef.current.set(targetFile.id, objUrl);
            patchResolvedFileUrl(targetFile.id, objUrl);
            options?.onProgress?.(100);
            return objUrl;
          }
        }

        // 2. Fallback to cross-origin Firestore chunked storage
        for (const uid of candidateUids) {
          const cloudBlob = await firestoreService.getFileBlobFromCloudChunks(
            uid,
            targetFile.id,
            targetFile.cloudChunkCount,
            targetFile.mimeType,
            targetFile.name,
            (loaded, total) => {
              if (total > 0) {
                options?.onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
              }
            }
          );
          if (cloudBlob && cloudBlob.size > 0) {
            const playable = ensurePlayableBlob(cloudBlob, targetFile);
            await saveFileBlob(targetFile.id, playable).catch(() => {});
            const objUrl = URL.createObjectURL(playable);
            liveObjectUrlsRef.current.set(targetFile.id, objUrl);
            patchResolvedFileUrl(targetFile.id, objUrl);
            options?.onProgress?.(100);
            return objUrl;
          }
        }
      } catch (err) {
        console.warn('Cloud media resolution error:', err);
      } finally {
        mediaResolvingRef.current.delete(targetFile.id);
        if (options?.priority) {
          foregroundMediaIdsRef.current.delete(targetFile.id);
        }
      }

      if (targetFile.type === 'image' && targetFile.thumbnail) {
        return targetFile.thumbnail;
      }
      return targetFile.url;
    })();

    mediaResolvingRef.current.set(targetFile.id, resolvePromise);
    return resolvePromise;
  };

  const syncSingleFileToCloud = async (
    file: CloudFile,
    onProgress?: (percent: number) => void
  ): Promise<CloudFile> => {
    if (!canonicalUserId || canonicalUserId === 'guest_user') {
      onProgress?.(100);
      return file;
    }

    const baseFile: CloudFile = {
      ...file,
      ownerId: canonicalUserId,
      mimeType: inferMediaMimeType(file.name, file.mimeType),
    };

    if (!shouldChunkFileToCloud(baseFile.sizeBytes)) {
      const canInline = baseFile.sizeBytes <= INLINE_CLOUD_FILE_THRESHOLD_BYTES || Boolean(baseFile.content);
      const savedOk = await firestoreService
        .saveFile(canonicalUserId, { ...baseFile, cloudSynced: canInline })
        .catch(() => false);
      onProgress?.(100);
      return {
        ...baseFile,
        cloudSynced: Boolean(canInline && savedOk),
      };
    }

    chunkUploadingIdsRef.current.add(baseFile.id);
    try {
      const blob = await getFileBlob(baseFile.id);
      if (blob && blob.size > 0) {
        onProgress?.(15);
        await firestoreService
          .uploadMediaBlobToServer(
            canonicalUserId,
            baseFile.id,
            blob,
            baseFile.mimeType || blob.type,
            baseFile.name
          )
          .catch(() => false);

        onProgress?.(25);
        const uploadedCount = await firestoreService.saveFileChunks(
          canonicalUserId,
          baseFile.id,
          blob,
          baseFile.mimeType || blob.type,
          baseFile.name,
          (done, total) => {
            if (total > 0) {
              const pct = Math.min(95, Math.round(25 + (done / total) * 70));
              onProgress?.(pct);
            }
          }
        );

        const syncedFile: CloudFile = {
          ...baseFile,
          ...(uploadedCount > 0 ? { cloudChunkCount: uploadedCount } : {}),
          cloudSynced: uploadedCount > 0,
        };
        const metaSaved = await firestoreService
          .saveFile(canonicalUserId, syncedFile)
          .catch(() => false);
        onProgress?.(100);
        return {
          ...syncedFile,
          cloudSynced: Boolean(uploadedCount > 0 && metaSaved),
        };
      }
      await firestoreService.saveFile(canonicalUserId, { ...baseFile, cloudSynced: false }).catch(() => false);
    } catch (err) {
      console.warn('Direct chunk upload warning:', err);
    } finally {
      chunkUploadingIdsRef.current.delete(baseFile.id);
    }

    return { ...baseFile, cloudSynced: false };
  };

  const syncFileChunksInBackground = async (targetUid: string, targetFiles: CloudFile[]) => {
    if (!targetUid || targetUid === 'guest_user' || !targetFiles.length) return;
    if (isFirestoreQuotaCooldownActive()) return;

    for (const f of targetFiles) {
      if (!f || f.type === 'folder' || chunkUploadingIdsRef.current.has(f.id)) continue;
      if (!needsCloudChunkUpload(f)) continue;
      if (isFirestoreQuotaCooldownActive()) break;

      chunkUploadingIdsRef.current.add(f.id);
      try {
        const blob = await getFileBlob(f.id);
        if (blob && blob.size > 0) {
          await firestoreService
            .uploadMediaBlobToServer(
              targetUid,
              f.id,
              blob,
              f.mimeType || blob.type,
              f.name
            )
            .catch(() => false);
          const uploadedCount = await firestoreService.saveFileChunks(
            targetUid,
            f.id,
            blob,
            f.mimeType || blob.type,
            f.name
          );
          if (uploadedCount > 0) {
            const resolvedMime = inferMediaMimeType(f.name, f.mimeType || blob.type);
            const repaired: CloudFile = {
              ...f,
              cloudChunkCount: uploadedCount,
              cloudSynced: true,
              mimeType: resolvedMime,
            };
            await firestoreService.saveFile(targetUid, repaired).catch(() => false);
            setFiles((prev) =>
              prev.map((item) =>
                item.id === f.id ? repaired : item
              )
            );
            continue;
          }
        }

        // Verify if legacy chunks already exist completely in Firestore before giving up
        if ((f.cloudChunkCount || 0) > 0 && !f.cloudSynced) {
          const check = await firestoreService.verifyCloudChunksExist(
            targetUid,
            f.id,
            f.cloudChunkCount
          );
          if (check.complete && check.totalChunks > 0) {
            const repaired: CloudFile = {
              ...f,
              cloudChunkCount: check.totalChunks,
              cloudSynced: true,
            };
            await firestoreService.saveFile(targetUid, repaired).catch(() => false);
            setFiles((prev) =>
              prev.map((item) =>
                item.id === f.id
                  ? { ...item, cloudChunkCount: check.totalChunks, cloudSynced: true }
                  : item
              )
            );
          }
        }
      } catch (err) {
        console.warn('Background chunk upload warning:', err);
      } finally {
        chunkUploadingIdsRef.current.delete(f.id);
      }
    }
  };

  const hydrateMissingCloudMedia = async (targetFiles: CloudFile[], overrideUid?: string) => {
    const PREHYDRATE_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;
    const queue = targetFiles.filter((f) => {
      if (f.type !== 'image') return false;
      if (f.url) return false;
      if (f.sizeBytes > PREHYDRATE_IMAGE_MAX_BYTES) return false;
      return (
        (f.cloudChunkCount && f.cloudChunkCount > 0) ||
        (f.sizeBytes > 0 && f.sizeBytes <= MAX_CLOUD_CHUNK_FILE_BYTES)
      );
    });

    if (queue.length === 0) return;

    for (const item of queue) {
      while (foregroundMediaIdsRef.current.size > 0) {
        await new Promise((r) => setTimeout(r, 250));
      }
      await resolveCloudMediaUrl(item, overrideUid).catch(() => undefined);
    }
  };

  // Hydrate IndexedDB blobs & user's saved orbit preset on boot and whenever active user changes
  useEffect(() => {
    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      const userOrbit = getSavedOrbitTheme(canonicalUserId);
      setOrbitPreset(userOrbit);
      applyOrbitTheme(userOrbit, canonicalUserId);
    }

    let cancelled = false;
    if (!hasExistingUser && (!canonicalUserId || canonicalUserId === 'guest_user')) {
      return;
    }

    const hydrateInitial = async () => {
      const scoped = storageProviderMock.loadMetadataState(
        canonicalUserId !== 'guest_user' ? canonicalUserId : undefined
      );
      const deletedIds = loadDeletedFileIds(canonicalUserId);
      const scopedFiles = scoped.files || [];
      const mergedLocal = mergeCloudAndLocalFiles(scopedFiles, filesRef.current, deletedIds);
      const localBin = scoped.recycleBin && scoped.recycleBin.length > 0 ? scoped.recycleBin : recycleBinRef.current;

      const [hydratedFiles, hydratedBin] = await Promise.all([
        hydrateCloudFiles(mergedLocal),
        hydrateCloudFiles(localBin),
      ]);

      if (cancelled) return;
      if (hydratedFiles.length > 0 || filesRef.current.length === 0) {
        setFiles(hydratedFiles);
        const calc = computeStorageBreakdown(hydratedFiles, siteSettings.totalStorageGB || 1000);
        setStorage(calc);
      }
      if (hydratedBin.length > 0 || recycleBinRef.current.length === 0) {
        setRecycleBin(hydratedBin);
      }
    };

    hydrateInitial();
    return () => {
      cancelled = true;
    };
  }, [canonicalUserId]);

  // Auto-compress oversized existing avatar Data URLs (e.g. >180KB) so Firestore user profile writes stay <1MB
  useEffect(() => {
    if (!user.avatarUrl || !user.avatarUrl.startsWith('data:') || user.avatarUrl.length <= 180_000) {
      return;
    }
    let cancelled = false;
    compressImageToSafeDataUrl(user.avatarUrl, { maxDim: 320, maxChars: 150_000 }).then((compactAvatar) => {
      if (cancelled) return;
      const safeAvatar = compactAvatar || '';
      setUser((prev) => {
        const nextUser = { ...prev, avatarUrl: safeAvatar };
        storageProviderMock.saveMetadataState(
          filesRef.current,
          nextUser,
          storage,
          recycleBinRef.current,
          canonicalUserId
        );
        return nextUser;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user.avatarUrl, canonicalUserId]);

  // Real-time scoped synchronization of active user account, payments, files & recycle bin across websites
  useEffect(() => {
    if (!canonicalUserId || canonicalUserId === 'guest_user') return;
    let active = true;

    // 1. Ensure current account is published to Firestore once per session (bridges legacy local accounts)
    if (currentUserRecord && !syncedAccountOnSessionRef.current.has(canonicalUserId)) {
      syncedAccountOnSessionRef.current.add(canonicalUserId);
      firestoreService.saveRegisteredUser(currentUserRecord).catch(() => {});
    }

    // 2. One-time merge of any legacy / secondary owner IDs without duplicating primary canonicalUserId read
    const secondaryIds = getCandidateOwnerIds().filter((id) => id !== canonicalUserId);
    if (secondaryIds.length > 0) {
      firestoreService
        .getUserFiles(secondaryIds[0], secondaryIds.slice(1))
        .then(async (legacyFiles) => {
          if (!active || !legacyFiles || legacyFiles.length === 0) return;
          const deletedIds = loadDeletedFileIds(canonicalUserId);
          const merged = mergeCloudAndLocalFiles(legacyFiles, filesRef.current, deletedIds);
          const hydrated = await hydrateCloudFiles(merged);
          if (!active) return;
          setFiles(hydrated);
          const nextStorage = computeStorageBreakdown(hydrated, siteSettings.totalStorageGB || 1000);
          setStorage(nextStorage);
          storageProviderMock.saveMetadataState(hydrated, user, nextStorage, recycleBinRef.current, canonicalUserId);
          void hydrateMissingCloudMedia(hydrated, canonicalUserId);
        })
        .catch(() => {});
    }

    // 3. Load recycle bin once for active user
    firestoreService.getUserDeletedFiles(canonicalUserId).then(async (cloudBin) => {
      if (!active) return;
      if (cloudBin && cloudBin.length > 0) {
        const mergedBin = mergeCloudAndLocalFiles(cloudBin, recycleBinRef.current);
        const hydratedBin = await hydrateCloudFiles(mergedBin);
        if (!active) return;
        setRecycleBin(hydratedBin);
        storageProviderMock.saveMetadataState(filesRef.current, user, storage, hydratedBin, canonicalUserId);
      }
    });

    // 4. Scoped 1-doc listener for active user's account record & lifetime status
    const unsubUserDoc = firestoreService.subscribeToUserRecord(canonicalUserId, (cloudUser, meta) => {
      if (!active) return;
      if (cloudUser) {
        confirmedServerAccountRef.current.add(canonicalUserId);
        setRegisteredUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === cloudUser.id);
          const mergedRec = idx >= 0 ? mergeRegisteredUserRecords(cloudUser, prev[idx]) : cloudUser;
          const next = idx >= 0 ? prev.map((u, i) => (i === idx ? mergedRec : u)) : [mergedRec, ...prev];
          try {
            localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(next));
          } catch {}
          return next;
        });
      } else if (
        meta &&
        !meta.fromCache &&
        confirmedServerAccountRef.current.has(canonicalUserId) &&
        !sessionAuthenticatedRef.current &&
        hasExistingUser &&
        !isFirestoreQuotaCooldownActive()
      ) {
        storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
        clearAiThreadsFromStorage(canonicalUserId);
        setUser(initialUserProfile);
        setFiles([]);
        setRecycleBin([]);
        setStorage(initialStorageUsage);
        const resetChat = createAiThread();
        setAiThreads([resetChat]);
        setActiveAiThreadId(resetChat.id);
        setScreen('welcome-email');
        clearAllFileBlobs().catch(() => {});
      }
    });

    // 5. Scoped user payment listener (only reads active user's payment requests)
    const unsubUserPayments = firestoreService.subscribeToUserPayments(
      canonicalUserId,
      (userPayments, meta) => {
        if (!active) return;
        if (!meta?.fromCache || userPayments.length > 0) {
          setPaymentRequests((prev) => {
            const byId = new Map<string, PaymentRequest>();
            prev.forEach((p) => {
              if (p.userId !== canonicalUserId) {
                byId.set(p.id, p);
              }
            });
            userPayments.forEach((p) => {
              byId.set(p.id, p);
            });
            const next = Array.from(byId.values());
            try {
              localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    );

    // 6. Live files collection listener (single source for active user's files)
    const unsubFiles = firestoreService.subscribeToFiles(canonicalUserId, async (cloudFiles, meta) => {
      if (!active) return;
      const deletedIds = loadDeletedFileIds(canonicalUserId);
      const merged = mergeCloudAndLocalFiles(cloudFiles, filesRef.current, deletedIds, {
        pruneSyncedMissingFromCloud: Boolean(meta && !meta.fromCache),
        activeOwnerId: canonicalUserId,
      });
      const hydrated = await hydrateCloudFiles(merged);
      if (!active) return;

      setFiles(hydrated);
      const nextStorage = computeStorageBreakdown(hydrated, siteSettings.totalStorageGB || 1000);
      setStorage(nextStorage);
      storageProviderMock.saveMetadataState(hydrated, user, nextStorage, recycleBinRef.current, canonicalUserId);

      // Push any locally-uploaded active files that are not yet present in Firestore snapshot
      const cloudIdSet = new Set(cloudFiles.map((f) => f.id));
      const filesToSyncChunks: CloudFile[] = [];
      hydrated.forEach((f) => {
        if (deletedIds.has(f.id)) return;
        if (f.ownerId && f.ownerId !== canonicalUserId) return;
        if (!cloudIdSet.has(f.id) && !f.cloudSynced) {
          firestoreService.saveFile(canonicalUserId, f).catch(() => {});
          filesToSyncChunks.push(f);
        } else if (needsCloudChunkUpload(f)) {
          filesToSyncChunks.push(f);
        }
      });
      if (filesToSyncChunks.length > 0) {
        void syncFileChunksInBackground(canonicalUserId, filesToSyncChunks);
      }
      void hydrateMissingCloudMedia(hydrated, canonicalUserId);
    });

    return () => {
      active = false;
      unsubUserDoc();
      unsubUserPayments();
      unsubFiles();
    };
  }, [canonicalUserId, extraOwnerIds.join('|')]);

  // Load & synchronize Bashar Cloud AI threads per user across localStorage & Firestore
  useEffect(() => {
    const localSaved = loadAiThreadsFromStorage(canonicalUserId);
    if (localSaved.length > 0) {
      setAiThreads(localSaved);
      setActiveAiThreadId((prev) =>
        localSaved.some((t) => t.id === prev) ? prev : localSaved[0].id
      );
    } else {
      const fresh = createAiThread();
      setAiThreads([fresh]);
      setActiveAiThreadId(fresh.id);
    }

    if (!canonicalUserId || canonicalUserId === 'guest_user') return;
    let active = true;

    const unsubChats = firestoreService.subscribeToAiChats(canonicalUserId, (cloudThreads) => {
      if (!active || isAiStreamingRef.current) return;
      if (cloudThreads.length > 0) {
        const merged = mergeAiThreads(cloudThreads, aiThreadsRef.current);
        aiThreadsRef.current = merged;
        setAiThreads(merged);
        saveAiThreadsToStorage(canonicalUserId, merged);
        setActiveAiThreadId((prev) =>
          merged.some((t) => t.id === prev) ? prev : merged[0].id
        );
      }
    });

    return () => {
      active = false;
      unsubChats();
    };
  }, [canonicalUserId]);

  useEffect(() => {
    const updateNow = () => setNowTick(Date.now());
    const intervalId = window.setInterval(updateNow, 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updateNow();
    };
    window.addEventListener('focus', updateNow);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', updateNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const effectiveRegisteredTimestamp =
    currentUserRecord?.registeredTimestamp ??
    user.registeredTimestamp ??
    (canonicalUserId && canonicalUserId !== 'guest_user'
      ? loadTrialStartTimestamp(canonicalUserId)
      : undefined);

  // Ensure every signed-in user (including legacy accounts) has a permanent trial start timestamp
  useEffect(() => {
    if (!canonicalUserId || canonicalUserId === 'guest_user') return;
    if (screen === 'welcome-email' || screen === 'welcome-phone') return;

    if (effectiveRegisteredTimestamp && effectiveRegisteredTimestamp > 0) {
      saveTrialStartTimestamp(canonicalUserId, effectiveRegisteredTimestamp);
      if (!user.registeredTimestamp) {
        setUser((prev) => ({ ...prev, registeredTimestamp: effectiveRegisteredTimestamp }));
      }
      return;
    }

    const initializedTs = saveTrialStartTimestamp(canonicalUserId, Date.now());
    setUser((prev) => {
      const updatedUser = { ...prev, registeredTimestamp: initializedTs };
      storageProviderMock.saveMetadataState(
        filesRef.current,
        updatedUser,
        storage,
        recycleBinRef.current,
        canonicalUserId
      );
      return updatedUser;
    });

    if (currentUserRecord && !currentUserRecord.registeredTimestamp) {
      const updatedRecord = { ...currentUserRecord, registeredTimestamp: initializedTs };
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === currentUserRecord.id ? updatedRecord : u))
      );
      firestoreService.saveRegisteredUser(updatedRecord).catch(() => {});
    }
  }, [canonicalUserId, screen, effectiveRegisteredTimestamp, currentUserRecord?.id]);

  // Subscription calculation (30 days free trial, then strictly locked unless 100 TK lifetime is approved)
  const subscription = calculateSubscription(
    effectiveRegisteredTimestamp,
    currentUserRecord?.isLifetimeApproved,
    currentUserRecord?.paymentStatus,
    nowTick
  );

  const isAccountLocked = subscription.isExpired && !subscription.isLifetimeApproved;

  // Immediately close open file/upload/rename modals if 30-day trial expires
  useEffect(() => {
    if (isAccountLocked) {
      setPreviewFile(null);
      setSelectedAudioFile(null);
      setSelectedZipFile(null);
      setIsZipModalOpen(false);
      setIsRecycleBinOpen(false);
      setIsCreateFileOpen(false);
      setIsNewFolderOpen(false);
      setFileToRename(null);
      setIsUploadFlowOpen(false);
      setPendingUploadFiles([]);
      setIsFabOpen(false);
    }
  }, [isAccountLocked]);

  // Synchronize document title with dynamic website name
  useEffect(() => {
    if (siteSettings.websiteName) {
      document.title = `${siteSettings.websiteName} - Cloud Storage`;
    }
  }, [siteSettings.websiteName]);

  // Persist registered users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(registeredUsers));
    } catch {}
  }, [registeredUsers]);

  // Persist payment requests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(paymentRequests));
    } catch {}
  }, [paymentRequests]);

  // Trigger synchronization with storage provider & Firestore
  const performSync = async (silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await storageProviderMock.syncWithProvider(
        files,
        user,
        storage,
        recycleBin,
        canonicalUserId
      );
      setLastSyncTime(result.timestamp);
      if (!silent) {
        setSyncToast(`Cloud Synced: ${result.itemCount} files metadata persisted`);
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Periodic local persistence (zero idle Firestore write quota burn)
  useEffect(() => {
    if (!cloudSyncEnabled || screen !== 'main') return;

    const interval = setInterval(() => {
      storageProviderMock.saveMetadataState(
        filesRef.current,
        user,
        storage,
        recycleBinRef.current,
        canonicalUserId
      );
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 60000);

    return () => clearInterval(interval);
  }, [cloudSyncEnabled, screen, user, storage, canonicalUserId]);

  // Verify Firebase Firestore & establish lightweight global listeners (full user/payment collections load ONLY in Admin Panel)
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });

    const dedupeUserList = (list: RegisteredUser[]): RegisteredUser[] => {
      const seen = new Set<string>();
      const res: RegisteredUser[] = [];
      for (const u of list) {
        if (!u || !u.id || seen.has(u.id)) continue;
        seen.add(u.id);
        res.push(u);
      }
      return res;
    };

    firestoreService.getMirrorUsers().then((mirrorUsers) => {
      if (mirrorUsers.length > 0) {
        setHasRemoteUsers(true);
        setRegisteredUsers((prev) => dedupeUserList([...mirrorUsers, ...prev]));
      }
    });

    firestoreService.hasAnyRegisteredUsers().then((exists) => {
      if (exists) {
        setHasRemoteUsers(true);
      }
    });

    // Synchronize Site Settings (1 global doc)
    const unsubscribeSettings = firestoreService.subscribeToSiteSettings((cloudSettings) => {
      if (cloudSettings) {
        setSiteSettings((prev) => ({
          ...prev,
          ...cloudSettings,
          logoUrl: cloudSettings.logoUrl || prev.logoUrl || defaultSiteSettings.logoUrl,
          bkashNumber: cloudSettings.bkashNumber || prev.bkashNumber || '01734211584',
          nagadNumber: cloudSettings.nagadNumber || prev.nagadNumber || '01734211584',
        }));
      }
    });

    // Synchronize Admin Advertisements / Announcements
    const unsubscribeAnnouncements = firestoreService.subscribeToAnnouncements(
      (cloudAds, meta) => {
        if (!meta?.fromCache || cloudAds.length > 0) {
          const sorted = sortAnnouncementsNewestFirst(cloudAds);
          setAnnouncements(sorted);
          saveAnnouncementsToStorage(sorted);
        }
      }
    );

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !user.email) {
        setUser((prev) => ({
          ...prev,
          email: firebaseUser.email || prev.email,
          name: firebaseUser.displayName || prev.name,
        }));
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeAnnouncements();
      unsubscribeAuth();
    };
  }, []);

  // Load full registered_users & payment_requests listeners ONLY while Admin Panel is open
  useEffect(() => {
    if (screen !== 'admin-panel') return;

    const dedupeUserList = (list: RegisteredUser[]): RegisteredUser[] => {
      const seen = new Set<string>();
      const res: RegisteredUser[] = [];
      for (const u of list) {
        if (!u || !u.id || seen.has(u.id)) continue;
        seen.add(u.id);
        res.push(u);
      }
      return res;
    };

    const unsubUsers = firestoreService.subscribeToRegisteredUsers((users, meta) => {
      if (!meta?.fromCache) {
        const safeUsers = dedupeUserList(users || []);
        setRegisteredUsers(safeUsers);
        try {
          localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(safeUsers));
        } catch {}
      } else if (users && users.length > 0) {
        const safeUsers = dedupeUserList(users);
        setRegisteredUsers((prev) => (prev.length > 0 ? prev : safeUsers));
      }
    });

    const unsubPayments = firestoreService.subscribeToPaymentRequests((cloudPayments, meta) => {
      if (!meta?.fromCache || cloudPayments.length > 0) {
        setPaymentRequests(cloudPayments);
        try {
          localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(cloudPayments));
        } catch {}
      }
    });

    return () => {
      unsubUsers();
      unsubPayments();
    };
  }, [screen]);

  // Recalculate storage breakdown & persist locally + sync usage to Firestore only when counts/size change
  const persistVaultState = (
    updatedFiles: CloudFile[],
    updatedBin: CloudFile[] = recycleBinRef.current,
    overrideUserId?: string
  ) => {
    const newStorage = computeStorageBreakdown(updatedFiles, siteSettings.totalStorageGB || 1000);
    const totalBytes = updatedFiles.reduce((sum, f) => sum + (Number(f.sizeBytes) || 0), 0);
    const usedMB = totalBytes === 0 ? 0 : Math.max(1, Math.round(totalBytes / (1024 * 1024)));
    const targetUid = overrideUserId || canonicalUserId;

    setStorage(newStorage);
    storageProviderMock.saveMetadataState(updatedFiles, user, newStorage, updatedBin, targetUid);

    const metaChanged =
      !lastSyncedMetaRef.current ||
      lastSyncedMetaRef.current.uid !== targetUid ||
      lastSyncedMetaRef.current.filesCount !== updatedFiles.length ||
      lastSyncedMetaRef.current.usedMB !== usedMB;

    if (metaChanged) {
      lastSyncedMetaRef.current = {
        uid: targetUid,
        filesCount: updatedFiles.length,
        usedMB,
      };
      setRegisteredUsers((prev) =>
        prev.map((u) => {
          if (
            u.id === targetUid ||
            (user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
            (user.phone && cleanPhone(u.phone) === cleanPhone(user.phone))
          ) {
            const updatedRecord = {
              ...u,
              filesCount: updatedFiles.length,
              storageUsedMB: usedMB,
            };
            if (cloudSyncEnabled && targetUid && targetUid !== 'guest_user') {
              firestoreService.saveRegisteredUser(updatedRecord).catch(() => {});
            }
            return updatedRecord;
          }
          return u;
        })
      );

      if (cloudSyncEnabled && targetUid && targetUid !== 'guest_user') {
        firestoreService.saveStorageUsage(targetUid, newStorage).catch(() => {});
      }
    }
  };

  // Guard for locked operations
  const checkActionAllowed = (): boolean => {
    if (isAccountLocked) {
      setScreen('payment');
      return false;
    }
    return true;
  };

  // Upload multiple native files at once - launches the 4-step Upload Flow ONLY with chosen files
  const handleUploadMultipleFiles = (uploadedFiles: File[]) => {
    if (!checkActionAllowed()) return;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    setPendingUploadFiles(uploadedFiles);
    setIsUploadFlowOpen(true);
  };

  // Commit files from the 4-step Upload Flow into IndexedDB, localStorage & Cloud Firestore
  const handleCommitUploadFlow = async (
    uploadedFiles: CloudFile[],
    destinationFolderId?: string | null,
    options?: { navigateToFiles?: boolean }
  ) => {
    if (!checkActionAllowed()) return;
    const navigateToFiles = options?.navigateToFiles !== false;

    if (uploadedFiles && uploadedFiles.length > 0) {
      const finalizedFiles: CloudFile[] = uploadedFiles.map((file) => ({
        ...file,
        parentFolderId: destinationFolderId ?? file.parentFolderId ?? null,
        versions:
          file.versions && file.versions.length > 0
            ? file.versions
            : [
                createInitialVersion(
                  {
                    id: file.id,
                    name: file.name,
                    sizeBytes: file.sizeBytes,
                    formattedSize: file.formattedSize,
                    date: file.date || 'Today',
                  },
                  user.name
                ),
              ],
      }));

      removeDeletedFileIds(
        canonicalUserId,
        finalizedFiles.map((f) => f.id)
      );

      const newIds = new Set(finalizedFiles.map((f) => f.id));
      const existingFiltered = filesRef.current.filter((f) => !newIds.has(f.id));
      const updated = [...finalizedFiles, ...existingFiltered];
      setFiles(updated);
      persistVaultState(updated);

      if (canonicalUserId && canonicalUserId !== 'guest_user') {
        const pendingMetadata = finalizedFiles.filter((f) => !f.cloudSynced);
        if (pendingMetadata.length > 0) {
          void Promise.all(
            pendingMetadata.map((f) =>
              firestoreService.saveFile(canonicalUserId, f).catch(() => {})
            )
          );
        }
        const pendingChunks = finalizedFiles.filter((f) => needsCloudChunkUpload(f));
        if (pendingChunks.length > 0) {
          void syncFileChunksInBackground(canonicalUserId, pendingChunks);
        }
      }

      const syncedCount = finalizedFiles.filter((f) => f.cloudSynced).length;
      setSyncToast(
        syncedCount === finalizedFiles.length
          ? `সফলভাবে ${finalizedFiles.length}টি ফাইল ক্লাউডে সংরক্ষিত হয়েছে!`
          : `${finalizedFiles.length}টি ফাইল সেভ হয়েছে (ক্লাউড সিঙ্ক চলছে)`
      );
      setTimeout(() => setSyncToast(null), 3000);
    }

    if (navigateToFiles) {
      setInitialFilesFilter('all');
      setInitialFilesFolderId(destinationFolderId ?? null);
      setCurrentTab('files');
    }
  };

  // Create folder directly from inside the Upload Flow (Step 3: Create Folder)
  const handleCreateFolderFromUpload = (folderName: string): CloudFile => {
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: folderName,
      type: 'folder',
      sizeBytes: 0,
      formattedSize: '0 B',
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      isFavorite: false,
      parentFolderId: null,
      itemCount: 0,
    };
    const updated = [newFolder, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    firestoreService.saveFile(canonicalUserId, newFolder).catch(() => {});
    return newFolder;
  };

  // Create New File with custom name and content (Saved persistently to IndexedDB + Firestore)
  const handleCreateNewFile = async (fileName: string, _type: string, content: string) => {
    if (!checkActionAllowed()) return;
    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const nativeFile = new File([content], fileName, { type: 'text/plain;charset=utf-8' });
    const createdFile = await buildCloudFileFromBrowserFile(nativeFile, {
      id: fileId,
      parentFolderId: null,
      uploaderName: user.name,
      typeOverride: 'document',
    });

    const newFile: CloudFile = {
      ...createdFile,
      content,
    };

    const updated = [newFile, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    firestoreService.saveFile(canonicalUserId, newFile).catch(() => {});
    setSyncToast(`"${fileName}" সফলভাবে তৈরি ও সংরক্ষিত হয়েছে!`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Extract / Unzip real archive entries into cloud storage
  const handleExtractZip = async (archiveFile: CloudFile) => {
    if (!checkActionAllowed()) return;

    const extractedFiles: CloudFile[] = [];
    const blob = await getFileBlob(archiveFile.id);

    if (blob && archiveFile.name.toLowerCase().endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(blob);
        const entryTasks: Array<{ name: string; entry: JSZip.JSZipObject }> = [];
        zip.forEach((relativePath, entry) => {
          if (!entry.dir) {
            entryTasks.push({ name: relativePath, entry });
          }
        });

        for (let idx = 0; idx < entryTasks.length; idx++) {
          const { name: relPath, entry } = entryTasks[idx];
          const entryBlob = await entry.async('blob');
          const cleanName = relPath.split('/').pop() || relPath;
          const extractedNative = new File([entryBlob], cleanName);
          const extractedId = `extracted-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
          const built = await buildCloudFileFromBrowserFile(extractedNative, {
            id: extractedId,
            parentFolderId: archiveFile.parentFolderId ?? null,
            uploaderName: user.name,
          });
          extractedFiles.push(built);
        }
      } catch (err) {
        console.warn('ZIP blob extraction warning:', err);
      }
    }

    // Metadata-only fallback if archive blob wasn't stored locally (e.g. synced from another device)
    if (extractedFiles.length === 0 && archiveFile.archiveEntries && archiveFile.archiveEntries.length > 0) {
      archiveFile.archiveEntries
        .filter((e) => !e.isDir)
        .forEach((entry, idx) => {
          const lower = entry.name.toLowerCase();
          let type: FileType = 'document';
          if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
            type = 'image';
          } else if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.aac')) {
            type = 'audio';
          } else if (lower.endsWith('.mp4') || lower.endsWith('.mov')) {
            type = 'video';
          }
          const sizeBytes = entry.sizeBytes || 0;
          extractedFiles.push({
            id: `extracted-${Date.now()}-${idx}`,
            name: entry.name.split('/').pop() || entry.name,
            type,
            sizeBytes,
            formattedSize: entry.size || formatBytes(sizeBytes),
            date: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            isFavorite: false,
            parentFolderId: archiveFile.parentFolderId ?? null,
          });
        });
    }

    if (extractedFiles.length === 0) {
      setSyncToast('আর্কাইভ থেকে কোনো ফাইল এক্সট্র্যাক্ট করা যায়নি');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    const updated = [...extractedFiles, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    extractedFiles.forEach((ef) => {
      firestoreService.saveFile(canonicalUserId, ef).catch(() => {});
    });
    setSyncToast(`${extractedFiles.length}টি ফাইল জিপ থেকে সফলভাবে আনজিপ ও সেভ হয়েছে!`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    if (!checkActionAllowed()) return;
    const updated = filesRef.current.map((f) => {
      if (f.id === id) {
        const next = { ...f, isFavorite: !f.isFavorite };
        firestoreService.saveFile(canonicalUserId, next).catch(() => {});
        if (previewFile && previewFile.id === id) {
          setPreviewFile(next);
        }
        return next;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
  };

  // Bulk Favorite
  const handleBulkFavorite = (ids: string[], makeFavorite: boolean) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const updated = filesRef.current.map((f) => {
      if (idSet.has(f.id)) {
        const next = { ...f, isFavorite: makeFavorite };
        firestoreService.saveFile(canonicalUserId, next).catch(() => {});
        return next;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
  };

  // Move file to Recycle Bin (persisted in localStorage + Firestore)
  const handleDeleteFile = (id: string) => {
    if (!checkActionAllowed()) return;
    const fileToDelete = filesRef.current.find((f) => f.id === id);
    if (!fileToDelete) return;

    addDeletedFileIds(canonicalUserId, [id]);
    const updatedFiles = filesRef.current.filter((f) => f.id !== id);
    const updatedBin = [fileToDelete, ...recycleBinRef.current];
    setFiles(updatedFiles);
    setRecycleBin(updatedBin);
    persistVaultState(updatedFiles, updatedBin);

    firestoreService.deleteFile(canonicalUserId, id).catch(() => {});
    firestoreService.saveDeletedFile(canonicalUserId, fileToDelete).catch(() => {});
  };

  // Permanent Delete (removes from state, IndexedDB blobs, Recycle Bin & Firestore)
  const handlePermanentDelete = (id: string) => {
    if (!checkActionAllowed()) return;
    addDeletedFileIds(canonicalUserId, [id]);
    liveObjectUrlsRef.current.delete(id);
    const updatedFiles = filesRef.current.filter((f) => f.id !== id);
    const updatedRecycle = recycleBinRef.current.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    persistVaultState(updatedFiles, updatedRecycle);

    deleteFileBlob(id).catch(() => {});
    firestoreService.deleteFile(canonicalUserId, id).catch(() => {});
    firestoreService.deleteFileChunks(canonicalUserId, id).catch(() => {});
    firestoreService.removeDeletedFile(canonicalUserId, id).catch(() => {});
  };

  // Bulk Permanent Delete
  const handleBulkPermanentDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    addDeletedFileIds(canonicalUserId, ids);
    const idSet = new Set(ids);
    const updatedFiles = filesRef.current.filter((f) => !idSet.has(f.id));
    const updatedRecycle = recycleBinRef.current.filter((f) => !idSet.has(f.id));
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    persistVaultState(updatedFiles, updatedRecycle);

    ids.forEach((id) => {
      liveObjectUrlsRef.current.delete(id);
      deleteFileBlob(id).catch(() => {});
      firestoreService.deleteFile(canonicalUserId, id).catch(() => {});
      firestoreService.deleteFileChunks(canonicalUserId, id).catch(() => {});
      firestoreService.removeDeletedFile(canonicalUserId, id).catch(() => {});
    });
  };

  // Bulk Delete to Recycle Bin
  const handleBulkDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    addDeletedFileIds(canonicalUserId, ids);
    const idSet = new Set(ids);
    const filesToDelete = filesRef.current.filter((f) => idSet.has(f.id));
    const updatedFiles = filesRef.current.filter((f) => !idSet.has(f.id));
    const updatedBin = [...filesToDelete, ...recycleBinRef.current];

    setFiles(updatedFiles);
    setRecycleBin(updatedBin);
    persistVaultState(updatedFiles, updatedBin);

    filesToDelete.forEach((f) => {
      firestoreService.deleteFile(canonicalUserId, f.id).catch(() => {});
      firestoreService.saveDeletedFile(canonicalUserId, f).catch(() => {});
    });
  };

  // Bulk Move files to a destination folder
  const handleBulkMove = (ids: string[], destinationFolderId: string | null) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const updated = filesRef.current.map((f) => {
      if (idSet.has(f.id) && f.id !== destinationFolderId) {
        const moved = { ...f, parentFolderId: destinationFolderId };
        firestoreService.saveFile(canonicalUserId, moved).catch(() => {});
        return moved;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
  };

  // Bulk Copy files (also duplicates IndexedDB blobs cleanly)
  const handleBulkCopy = async (ids: string[]) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const filesToCopy = filesRef.current.filter((f) => idSet.has(f.id) && f.type !== 'folder');
    const copies: CloudFile[] = filesToCopy.map((f, idx) => ({
      ...f,
      id: `copy-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${f.name} (Copy)`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    await Promise.all(
      copies.map((c, idx) => copyFileBlob(filesToCopy[idx].id, c.id).catch(() => {}))
    );

    const updated = [...copies, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    copies.forEach((c) => {
      firestoreService.saveFile(canonicalUserId, c).catch(() => {});
    });
  };

  // Single Copy file
  const handleCopyFile = async (file: CloudFile) => {
    if (!checkActionAllowed()) return;
    const copyId = `copy-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const copy: CloudFile = {
      ...file,
      id: copyId,
      name: `${file.name} (Copy)`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    await copyFileBlob(file.id, copyId).catch(() => {});
    const updated = [copy, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    firestoreService.saveFile(canonicalUserId, copy).catch(() => {});
  };

  // Single Move file
  const handleMoveFile = (id: string, destinationFolderId: string | null) => {
    if (!checkActionAllowed()) return;
    const updated = filesRef.current.map((f) => {
      if (f.id === id && f.id !== destinationFolderId) {
        const moved = { ...f, parentFolderId: destinationFolderId };
        firestoreService.saveFile(canonicalUserId, moved).catch(() => {});
        if (previewFile && previewFile.id === id) {
          setPreviewFile(moved);
        }
        return moved;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
  };

  // Rename a file or folder (with version history tracking)
  const handleRenameFile = (id: string, newName: string) => {
    if (!checkActionAllowed()) return;
    const updated = filesRef.current.map((f) => {
      if (f.id === id) {
        const renamed = appendFileVersion(f, 'Renamed', {
          newName,
          note: `Renamed from "${f.name}" to "${newName}"`,
          modifiedBy: user.name || 'User',
        });
        firestoreService.saveFile(canonicalUserId, renamed).catch(() => {});
        if (previewFile && previewFile.id === id) {
          setPreviewFile(renamed);
        }
        return renamed;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
  };

  // Restore an older version of a file
  const handleRestoreFileVersion = (targetFile: CloudFile, versionToRestore: FileVersion) => {
    if (!checkActionAllowed()) return;
    const updated = filesRef.current.map((f) => {
      if (f.id === targetFile.id) {
        const restored = appendFileVersion(f, 'Restored', {
          newName: versionToRestore.name || f.name,
          newSizeBytes: versionToRestore.sizeBytes,
          newFormattedSize: versionToRestore.formattedSize,
          note: `Restored to v${versionToRestore.versionNumber} (${versionToRestore.action})`,
          modifiedBy: user.name || 'User',
        });
        firestoreService.saveFile(canonicalUserId, restored).catch(() => {});
        return restored;
      }
      return f;
    });
    setFiles(updated);
    persistVaultState(updated);
    setSyncToast(`ফাইলটি v${versionToRestore.versionNumber} ভার্সনে সফলভাবে রিস্টোর করা হয়েছে`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Upload an updated version of a specific file (persists new binary into IndexedDB + Firestore)
  const handleUploadNewVersion = async (targetFile: CloudFile, newFile: File) => {
    if (!checkActionAllowed()) return;

    const rebuilt = await buildCloudFileFromBrowserFile(newFile, {
      id: targetFile.id,
      parentFolderId: targetFile.parentFolderId ?? null,
      uploaderName: user.name,
    });

    liveObjectUrlsRef.current.delete(targetFile.id);
    let updatedTargetForChunkSync: CloudFile | null = null;
    const updated = filesRef.current.map((f) => {
      if (f.id === targetFile.id) {
        const reuploaded = appendFileVersion(
          {
            ...f,
            url: rebuilt.url,
            thumbnail: rebuilt.thumbnail,
            mimeType: rebuilt.mimeType ?? f.mimeType,
            cloudChunkCount: rebuilt.cloudChunkCount ?? f.cloudChunkCount,
            content: rebuilt.content ?? f.content,
            archiveEntries: rebuilt.archiveEntries ?? f.archiveEntries,
          },
          'Re-uploaded',
          {
            newName: newFile.name,
            newSizeBytes: rebuilt.sizeBytes,
            newFormattedSize: rebuilt.formattedSize,
            note: `Re-uploaded with new file: ${newFile.name}`,
            modifiedBy: user.name || 'User',
          }
        );
        updatedTargetForChunkSync = reuploaded;
        firestoreService.saveFile(canonicalUserId, reuploaded).catch(() => {});
        return reuploaded;
      }
      return f;
    });

    setFiles(updated);
    persistVaultState(updated);
    if (updatedTargetForChunkSync && canonicalUserId && canonicalUserId !== 'guest_user') {
      void syncFileChunksInBackground(canonicalUserId, [updatedTargetForChunkSync]);
    }
    setSyncToast('নতুন ভার্সন সফলভাবে ক্লাউডে আপলোড ও সংরক্ষিত হয়েছে!');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Restore from Recycle Bin
  const handleRestoreFile = (id: string) => {
    if (!checkActionAllowed()) return;
    const fileToRestore = recycleBinRef.current.find((f) => f.id === id);
    if (!fileToRestore) return;

    removeDeletedFileIds(canonicalUserId, [id]);
    const updatedBin = recycleBinRef.current.filter((f) => f.id !== id);
    const updatedFiles = [fileToRestore, ...filesRef.current];
    setRecycleBin(updatedBin);
    setFiles(updatedFiles);
    persistVaultState(updatedFiles, updatedBin);

    firestoreService.removeDeletedFile(canonicalUserId, id).catch(() => {});
    firestoreService.saveFile(canonicalUserId, fileToRestore).catch(() => {});
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = () => {
    if (!checkActionAllowed()) return;
    const toErase = [...recycleBinRef.current];
    setRecycleBin([]);
    persistVaultState(filesRef.current, []);

    toErase.forEach((f) => {
      deleteFileBlob(f.id).catch(() => {});
    });
    firestoreService.clearUserRecycleBin(canonicalUserId).catch(() => {});
  };

  // Create New Folder
  const handleCreateFolder = (folderName: string) => {
    if (!checkActionAllowed()) return;
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: folderName,
      type: 'folder',
      sizeBytes: 0,
      formattedSize: '0 items',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isFavorite: false,
      parentFolderId: null,
      itemCount: 0,
    };

    const updated = [newFolder, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);
    firestoreService.saveFile(canonicalUserId, newFolder).catch(() => {});
    setIsNewFolderOpen(false);
  };

  // Category selection navigation
  const handleSelectCategory = (type: FileType) => {
    setInitialFilesFolderId(null);
    setInitialFilesFilter(type);
    setCurrentTab('files');
  };

  // FAB action handler (File pickers are launched directly by FloatingActionMenu)
  const handleFabAction = (action: string) => {
    setIsFabOpen(false);
    if (!checkActionAllowed()) return;

    if (action === 'create-file') {
      setIsCreateFileOpen(true);
    } else if (action === 'folder') {
      setIsNewFolderOpen(true);
    }
  };

  // Save Profile Changes (Updates user & registeredUsers list)
  const handleSaveProfile = (updatedProfile: Partial<UserProfile>) => {
    const merged: UserProfile = {
      name: updatedProfile.name !== undefined ? updatedProfile.name : user.name,
      phone: updatedProfile.phone !== undefined ? updatedProfile.phone : user.phone,
      email: updatedProfile.email !== undefined ? updatedProfile.email : user.email,
      avatarUrl: updatedProfile.avatarUrl !== undefined ? updatedProfile.avatarUrl : user.avatarUrl,
      registeredTimestamp: user.registeredTimestamp,
    };
    setUser(merged);
    storageProviderMock.saveMetadataState(files, merged, storage, recycleBin, canonicalUserId);

    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      firestoreService.saveUserProfile(canonicalUserId, merged).catch(() => {});
    }

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          (user.email && u.email === user.email) ||
          (user.phone && u.phone === user.phone) ||
          (updatedProfile.email && u.email === updatedProfile.email)
        ) {
          const updatedRecord = {
            ...u,
            name: updatedProfile.name !== undefined ? updatedProfile.name : u.name,
            email: updatedProfile.email !== undefined ? updatedProfile.email : u.email,
            phone: updatedProfile.phone !== undefined ? updatedProfile.phone : u.phone,
            avatarUrl: updatedProfile.avatarUrl !== undefined ? updatedProfile.avatarUrl : u.avatarUrl,
          };
          firestoreService.saveRegisteredUser(updatedRecord).catch(() => {});
          return updatedRecord;
        }
        return u;
      })
    );
  };

  // Admin & User Account Deletion: Wipes user, all cloud files, storage, recycle bin, and payment data
  const handleDeleteUser = async (userId: string) => {
    const userToDelete = registeredUsers.find((u) => u.id === userId);
    const isCurrentById = canonicalUserId === userId;
    const targetContact = {
      id: userId,
      email: userToDelete?.email || (isCurrentById ? user.email : ''),
      phone: userToDelete?.phone || (isCurrentById ? user.phone : ''),
    };
    const isCurrent =
      isCurrentById ||
      (userToDelete && (
        (user.email && user.email.toLowerCase() === userToDelete.email.toLowerCase()) ||
        (user.phone && cleanPhone(user.phone) === cleanPhone(userToDelete.phone))
      ));

    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      const remaining = registeredUsers.filter((u) => u.id !== userId);
      localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(remaining));
    } catch {}

    // Cascade delete any payments belonging to this account immediately in local state & localStorage
    setPaymentRequests((prev) => {
      const remainingPayments = filterOutUserPayments(prev, targetContact);
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(remainingPayments));
      } catch {}
      return remainingPayments;
    });

    storageProviderMock.clearUserLocalVault(userId);
    clearRecentSearches(getRecentSearchesStorageKey(userId));
    try {
      localStorage.removeItem(`bashar_cloud_trial_start_${userId}`);
    } catch {}

    // If currently active user was deleted, reset UI and session immediately
    if (isCurrent) {
      setUser(initialUserProfile);
      setFiles([]);
      setRecycleBin([]);
      setStorage(initialStorageUsage);
      storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
      clearAiThreadsFromStorage(canonicalUserId);
      clearRecentSearches(getRecentSearchesStorageKey(canonicalUserId));
      const resetChat = createAiThread();
      setAiThreads([resetChat]);
      setActiveAiThreadId(resetChat.id);
      liveObjectUrlsRef.current.forEach((blobUrl) => {
        if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
      });
      liveObjectUrlsRef.current.clear();
      chunkUploadingIdsRef.current.clear();
      setScreen('welcome-email');
      void clearAllFileBlobs().catch(() => {});
    }

    setSyncToast('অ্যাকাউন্ট, পেমেন্ট ও সমস্ত ডাটা সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setSyncToast(null), 3000);

    await firestoreService
      .deleteRegisteredUserAndData(userId, {
        email: targetContact.email,
        phone: targetContact.phone,
      })
      .catch(() => {});

    if (isCurrent) {
      auth.signOut().catch(() => {});
    }
  };

  // Delete all accounts, payment requests, and data completely
  const handleDeleteAllUsers = async () => {
    registeredUsers.forEach((u) => {
      storageProviderMock.clearUserLocalVault(u.id);
      clearRecentSearches(getRecentSearchesStorageKey(u.id));
    });
    clearRecentSearches(getRecentSearchesStorageKey(canonicalUserId));
    clearRecentSearches();
    setRegisteredUsers([]);
    setPaymentRequests([]);
    try {
      localStorage.removeItem('bashar_cloud_registered_users');
      localStorage.removeItem('bashar_cloud_payment_requests');
    } catch {}
    await firestoreService.deleteAllRegisteredAccounts().catch(() => {});
    await clearAllFileBlobs().catch(() => {});

    setUser(initialUserProfile);
    setFiles([]);
    setRecycleBin([]);
    setStorage(initialStorageUsage);
    storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
    liveObjectUrlsRef.current.forEach((blobUrl) => {
      if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    });
    liveObjectUrlsRef.current.clear();
    chunkUploadingIdsRef.current.clear();
    setScreen('welcome-email');
    auth.signOut().catch(() => {});
    setSyncToast('সকল অ্যাকাউন্ট, পেমেন্ট ও ক্লাউড ডাটা সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Clear all files for a specific user
  const handleClearUserFiles = async (userId: string) => {
    storageProviderMock.clearUserLocalVault(userId);
    clearDeletedFileIds(userId);
    await firestoreService.clearAllUserFiles(userId).catch(() => {});
    const isCurrent = canonicalUserId === userId;
    if (isCurrent) {
      setFiles([]);
      setRecycleBin([]);
      persistVaultState([], [], userId);
      await clearAllFileBlobs().catch(() => {});
    }
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, filesCount: 0, storageUsedMB: 0 } : u))
    );
    setSyncToast('ইউজারের ফাইলসমূহ সম্পূর্ণ খালি করা হয়েছে');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Clear all files in active drive
  const handleClearAllFiles = async () => {
    const allIds = [...filesRef.current, ...recycleBinRef.current].map((f) => f.id);
    addDeletedFileIds(canonicalUserId, allIds);
    setFiles([]);
    setRecycleBin([]);
    persistVaultState([], []);
    await clearAllFileBlobs().catch(() => {});
    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      await firestoreService.clearAllUserFiles(canonicalUserId).catch(() => {});
    }
    setSyncToast('সকল ফাইল সফলভাবে মুছে ফেলা হয়েছে (ড্রাইভ খালি)');
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleDeleteAccount = async () => {
    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      await handleDeleteUser(canonicalUserId);
      return;
    }

    const fallbackTarget = {
      id: canonicalUserId,
      email: user.email,
      phone: user.phone,
    };
    setPaymentRequests((prev) => {
      const remaining = filterOutUserPayments(prev, fallbackTarget);
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });
    await firestoreService.deleteUserPaymentRequests(fallbackTarget).catch(() => {});

    setUser(initialUserProfile);
    setFiles([]);
    setRecycleBin([]);
    setStorage(initialStorageUsage);
    storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
    setScreen('welcome-email');
    auth.signOut().catch(() => {});
  };

  // Handle successful sign in / sign up (universal cross-website sync + clean isolation on new signup)
  const handleAuthSuccess = async (
    authenticatedUser: UserProfile,
    passwordPlain?: string,
    cloudRecord?: RegisteredUser,
    isNewSignup = false
  ) => {
    sessionAuthenticatedRef.current = true;
    const localMatches = findMatchingUserRecords(registeredUsers, {
      id: cloudRecord?.id,
      email: authenticatedUser.email,
      phone: authenticatedUser.phone,
    });
    const prevUser =
      localMatches.length > 0
        ? localMatches.reduce((acc, rec) => mergeRegisteredUserRecords(acc, rec))
        : cloudRecord;
    const unifiedSource =
      prevUser && cloudRecord
        ? mergeRegisteredUserRecords(cloudRecord, prevUser)
        : prevUser || cloudRecord;

    const resolvedId =
      unifiedSource?.id ||
      buildDeterministicAccountId(authenticatedUser.email, authenticatedUser.phone);
    const resolvedTimestamp =
      unifiedSource?.registeredTimestamp ||
      loadTrialStartTimestamp(resolvedId) ||
      Date.now();
    const persistedTs = saveTrialStartTimestamp(resolvedId, resolvedTimestamp);

    const userWithTimestamp: UserProfile = {
      ...authenticatedUser,
      registeredTimestamp: persistedTs,
    };
    setUser(userWithTimestamp);

    const userRecord: RegisteredUser = {
      id: resolvedId,
      name: authenticatedUser.name || (authenticatedUser.email ? authenticatedUser.email.split('@')[0] : 'User'),
      email: authenticatedUser.email.trim().toLowerCase(),
      phone: authenticatedUser.phone,
      passwordPlain: passwordPlain || unifiedSource?.passwordPlain || '••••••••',
      avatarUrl: authenticatedUser.avatarUrl || unifiedSource?.avatarUrl,
      registeredAt:
        unifiedSource?.registeredAt ||
        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      registeredTimestamp: persistedTs,
      filesCount: isNewSignup ? 0 : unifiedSource?.filesCount || (localMatches.length > 0 ? filesRef.current.length : 0),
      storageUsedMB: isNewSignup ? 0 : unifiedSource?.storageUsedMB || (localMatches.length > 0 ? Math.round(storage.usedGB * 1024) : 0),
      isLifetimeApproved: unifiedSource?.isLifetimeApproved ?? false,
      paymentStatus: unifiedSource?.paymentStatus || 'none',
      lastTrxId: unifiedSource?.lastTrxId || '',
    };

    const candidateIds = collectCandidateOwnerIds({
      canonicalUserId: resolvedId,
      matchedRecords: localMatches,
      email: userRecord.email,
      phone: userRecord.phone,
      extraIds: extraOwnerIds,
    });
    setExtraOwnerIds(candidateIds);
    syncedAccountOnSessionRef.current.add(resolvedId);

    // Save to Firestore so user is available across all websites instantly
    if (isNewSignup || !cloudRecord) {
      await firestoreService.saveRegisteredUser(userRecord).catch(() => {});
    } else {
      void firestoreService.saveRegisteredUser(userRecord).catch(() => {});
    }

    setRegisteredUsers((prev) =>
      prev.some((u) => u.id === userRecord.id)
        ? prev.map((u) => (u.id === userRecord.id ? userRecord : u))
        : [userRecord, ...prev]
    );

    if (isNewSignup) {
      // Strictly clean empty cloud vault for a fresh Sign Up
      setFiles([]);
      setRecycleBin([]);
      const freshStorage = { ...initialStorageUsage, totalGB: siteSettings.totalStorageGB || 1000 };
      setStorage(freshStorage);
      storageProviderMock.saveMetadataState(
        [],
        userWithTimestamp,
        freshStorage,
        [],
        userRecord.id
      );
      setInitialFilesFilter('all');
      setInitialFilesFolderId(null);
      setCurrentTab('home');
      setScreen('main');
      return;
    }

    // Immediately hydrate scoped local cache; useEffect([canonicalUserId]) handles live Firestore sync without duplicate reads
    const scopedLocal = storageProviderMock.loadMetadataState(userRecord.id);
    const localFiles = scopedLocal.files || [];
    const localBin = scopedLocal.recycleBin || [];
    const [hydratedLocal, hydratedBin] = await Promise.all([
      hydrateCloudFiles(localFiles),
      hydrateCloudFiles(localBin),
    ]);
    setFiles(hydratedLocal);
    setRecycleBin(hydratedBin);
    const nextStorage = computeStorageBreakdown(hydratedLocal, siteSettings.totalStorageGB || 1000);
    setStorage(nextStorage);
    storageProviderMock.saveMetadataState(
      hydratedLocal,
      userWithTimestamp,
      nextStorage,
      hydratedBin,
      userRecord.id
    );

    setInitialFilesFilter('all');
    setInitialFilesFolderId(null);
    setCurrentTab('home');
    setScreen('main');
  };

  // Submit payment details for admin approval
  const handleSubmitPayment = (
    paymentData: Omit<PaymentRequest, 'id' | 'submittedAt' | 'submittedTimestamp' | 'status'>
  ) => {
    const newRequest: PaymentRequest = {
      id: `pay-${Date.now()}`,
      ...paymentData,
      submittedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      submittedTimestamp: Date.now(),
      status: 'pending',
    };

    setPaymentRequests((prev) => {
      const filtered = prev.filter(
        (p) => !(p.userId === newRequest.userId || (newRequest.userEmail && p.userEmail === newRequest.userEmail))
      );
      const updated = [newRequest, ...filtered];
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    firestoreService.savePaymentRequest(newRequest).catch(() => {});

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if ((u.email && u.email === user.email) || (u.phone && u.phone === user.phone)) {
          const updatedU = {
            ...u,
            paymentStatus: 'pending' as PaymentStatus,
            lastTrxId: paymentData.transactionId,
          };
          firestoreService.saveRegisteredUser(updatedU).catch(() => {});
          return updatedU;
        }
        return u;
      })
    );
  };

  // Approve payment: unlocks user for lifetime access
  const handleApprovePayment = (paymentId: string) => {
    const targetReq = paymentRequests.find((p) => p.id === paymentId);
    if (!targetReq) return;

    const approvedReq = {
      ...targetReq,
      status: 'approved' as PaymentStatus,
      reviewedAt: new Date().toLocaleString(),
    };

    setPaymentRequests((prev) => {
      const updated = prev.map((p) => (p.id === paymentId ? approvedReq : p));
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreService.savePaymentRequest(approvedReq).catch(() => {});

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          u.id === targetReq.userId ||
          (targetReq.userEmail && u.email === targetReq.userEmail) ||
          (targetReq.userPhone && u.phone === targetReq.userPhone) ||
          (targetReq.senderPhone && u.phone === targetReq.senderPhone)
        ) {
          const updatedUser = {
            ...u,
            isLifetimeApproved: true,
            paymentStatus: 'approved' as PaymentStatus,
          };
          firestoreService.saveRegisteredUser(updatedUser).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );
  };

  // Reject payment: marks status rejected
  const handleRejectPayment = (paymentId: string) => {
    const targetReq = paymentRequests.find((p) => p.id === paymentId);
    if (!targetReq) return;

    const rejectedReq = {
      ...targetReq,
      status: 'rejected' as PaymentStatus,
      reviewedAt: new Date().toLocaleString(),
    };

    setPaymentRequests((prev) => {
      const updated = prev.map((p) => (p.id === paymentId ? rejectedReq : p));
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreService.savePaymentRequest(rejectedReq).catch(() => {});

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          u.id === targetReq.userId ||
          (targetReq.userEmail && u.email === targetReq.userEmail) ||
          (targetReq.userPhone && u.phone === targetReq.userPhone) ||
          (targetReq.senderPhone && u.phone === targetReq.senderPhone)
        ) {
          const updatedUser = {
            ...u,
            paymentStatus: 'rejected' as PaymentStatus,
          };
          firestoreService.saveRegisteredUser(updatedUser).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );
  };

  // Bashar Cloud AI Thread Actions & Streaming Chat
  const persistAiThreadList = (nextThreads: AiChatThread[], changedThreadId?: string) => {
    const sorted = sortAiThreads(nextThreads);
    aiThreadsRef.current = sorted;
    setAiThreads(sorted);
    saveAiThreadsToStorage(canonicalUserId, sorted);
    if (changedThreadId && canonicalUserId && canonicalUserId !== 'guest_user') {
      const target = sorted.find((t) => t.id === changedThreadId);
      if (target) {
        firestoreService.saveAiChat(canonicalUserId, target).catch(() => {});
      }
    }
    return sorted;
  };

  const handleCreateAiThread = (): AiChatThread => {
    const created = createAiThread();
    const next = persistAiThreadList([created, ...aiThreadsRef.current], created.id);
    setActiveAiThreadId(created.id);
    setAiErrorMsg(null);
    return next.find((t) => t.id === created.id) || created;
  };

  const handleTogglePinAiThread = (threadId: string) => {
    const next = togglePinAiThread(aiThreadsRef.current, threadId);
    persistAiThreadList(next, threadId);
  };

  const handleRenameAiThread = (threadId: string, newTitle: string) => {
    const next = renameAiThread(aiThreadsRef.current, threadId, newTitle);
    persistAiThreadList(next, threadId);
  };

  const handleDeleteAiThread = (threadId: string) => {
    if (streamingThreadId === threadId && aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
      isAiStreamingRef.current = false;
      setIsAiStreaming(false);
      setStreamingThreadId(null);
    }

    let remaining = deleteAiThread(aiThreadsRef.current, threadId);
    if (remaining.length === 0) {
      const fresh = createAiThread();
      remaining = [fresh];
    }
    const sorted = sortAiThreads(remaining);
    aiThreadsRef.current = sorted;
    setAiThreads(sorted);
    saveAiThreadsToStorage(canonicalUserId, sorted);
    if (activeAiThreadId === threadId) {
      setActiveAiThreadId(sorted[0].id);
    }
    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      firestoreService.deleteAiChat(canonicalUserId, threadId).catch(() => {});
    }
  };

  const handleChangeAiMode = (threadId: string, mode: AiMode) => {
    const next = setThreadMode(aiThreadsRef.current, threadId, mode);
    persistAiThreadList(next, threadId);
  };

  const handleStopAiStreaming = () => {
    userAbortedAiRef.current = true;
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }
    isAiStreamingRef.current = false;
    setIsAiStreaming(false);
    setStreamingThreadId(null);
  };

  const handleSendAiMessage = async (
    threadId: string,
    prompt: string,
    mode: AiMode,
    attachment?: AiAttachment | null
  ) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const currentThread = aiThreadsRef.current.find((t) => t.id === threadId);
    const msgs = currentThread?.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    const secondLastMsg = msgs[msgs.length - 2];
    const isRetryingFailedTurn = Boolean(
      lastMsg &&
        lastMsg.role === 'model' &&
        lastMsg.isError &&
        secondLastMsg &&
        secondLastMsg.role === 'user' &&
        secondLastMsg.text.trim() === trimmed
    );

    const historySource = isRetryingFailedTurn ? msgs.slice(0, -2) : msgs;
    const priorHistory = historySource
      .filter((m) => !m.isError && m.text.trim().length > 0)
      .map((m) => ({ role: m.role, text: m.text }));

    const now = Date.now();
    const userMsg: AiMessage = {
      id: `msg-u-${now}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: trimmed,
      createdAt: now,
      mode,
      attachment: attachment || undefined,
    };

    const assistantMsgId = isRetryingFailedTurn
      ? lastMsg.id
      : `msg-a-${now + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const assistantPlaceholder: AiMessage = {
      id: assistantMsgId,
      role: 'model',
      text: '',
      createdAt: now + 1,
      mode,
    };

    const nextThreads = isRetryingFailedTurn
      ? updateMessageInThread(
          aiThreadsRef.current,
          threadId,
          assistantMsgId,
          () => assistantPlaceholder
        )
      : appendMessageToThread(
          appendMessageToThread(aiThreadsRef.current, threadId, userMsg),
          threadId,
          assistantPlaceholder
        );
    persistAiThreadList(nextThreads, threadId);

    const controller = new AbortController();
    aiAbortRef.current = controller;
    userAbortedAiRef.current = false;
    isAiStreamingRef.current = true;
    setIsAiStreaming(true);
    setStreamingThreadId(threadId);
    setAiErrorMsg(null);

    const activeFilesList = filesRef.current;
    const totalUsedBytes = activeFilesList.reduce((acc, f) => acc + (Number(f.sizeBytes) || 0), 0);
    const usedText =
      storage.usedGB >= 1
        ? `${storage.usedGB} GB`
        : totalUsedBytes > 0
        ? formatBytes(totalUsedBytes)
        : '0 B';

    const requestBody = {
      message: trimmed,
      history: priorHistory,
      mode,
      userName: user.name,
      attachment: attachment
        ? {
            name: attachment.name,
            snippet: attachment.snippet,
            imageDataUrl: attachment.imageDataUrl,
            mimeType: attachment.mimeType,
          }
        : null,
      cloudSummary: {
        totalFiles: activeFilesList.length,
        usedText,
        totalLimitGB: storage.totalGB || 1000,
        imagesCount: storage.imagesCount,
        videosCount: storage.videosCount,
        audiosCount: storage.audiosCount,
        docsCount: storage.docsCount,
        recentNames: activeFilesList.slice(0, 12).map((f) => f.name),
      },
    };

    const applyStreamText = (replyText: string, usedModel: string) => {
      setAiThreads((prev) => {
        const updated = updateMessageInThread(prev, threadId, assistantMsgId, (m) => ({
          ...m,
          text: replyText,
          modelUsed: usedModel || m.modelUsed,
          isError: false,
        }));
        aiThreadsRef.current = updated;
        return updated;
      });
    };

    let firstChunkWatchdog: number | undefined;
    let stalledStreamTimedOut = false;

    try {
      const watchdogMs = mode === 'deep' ? 24000 : 18000;
      firstChunkWatchdog = window.setTimeout(() => {
        stalledStreamTimedOut = true;
        controller.abort();
      }, watchdogMs);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        if (firstChunkWatchdog) clearTimeout(firstChunkWatchdog);
        throw new Error('AI সার্ভার সাড়া দিচ্ছে না। অনুগ্রহ করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।');
      }
      if (!response.ok && !contentType.includes('text/event-stream')) {
        if (firstChunkWatchdog) clearTimeout(firstChunkWatchdog);
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `AI সার্ভার ত্রুটি (${response.status})`);
      }

      let fullReply = '';
      let modelUsed = '';

      if (contentType.includes('application/json')) {
        if (firstChunkWatchdog) clearTimeout(firstChunkWatchdog);
        const jsonData = await response.json().catch(() => ({}));
        if (jsonData.error) {
          throw new Error(jsonData.error);
        }
        fullReply = typeof jsonData.reply === 'string' ? jsonData.reply : '';
        modelUsed = typeof jsonData.model === 'string' ? jsonData.model : '';
        if (fullReply) {
          applyStreamText(fullReply, modelUsed);
        }
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const consumeEvents = (
          parsedEvents: Array<{ type?: string; text?: string; model?: string; error?: string }>
        ) => {
          for (const parsed of parsedEvents) {
            if (parsed.type === 'meta' && parsed.model) {
              modelUsed = parsed.model;
            } else if (parsed.type === 'chunk' && parsed.text) {
              if (firstChunkWatchdog) {
                clearTimeout(firstChunkWatchdog);
                firstChunkWatchdog = undefined;
              }
              fullReply += parsed.text;
              modelUsed = parsed.model || modelUsed;
              applyStreamText(fullReply, modelUsed);
            } else if (parsed.type === 'error') {
              if (firstChunkWatchdog) clearTimeout(firstChunkWatchdog);
              throw new Error(parsed.error || 'AI উত্তর তৈরিতে সমস্যা হয়েছে।');
            }
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const { events, remainder } = parseSseChunks(buffer, false);
            buffer = remainder;
            consumeEvents(events);
          }
        } catch (readErr) {
          if (!stalledStreamTimedOut) {
            throw readErr;
          }
        }

        if (buffer.trim() && !stalledStreamTimedOut) {
          const { events } = parseSseChunks(buffer, true);
          consumeEvents(events);
        }
      }

      if (firstChunkWatchdog) {
        clearTimeout(firstChunkWatchdog);
        firstChunkWatchdog = undefined;
      }

      // Proxy-proof non-streaming JSON fallback if SSE yielded nothing or timed out waiting for first chunk
      if (!fullReply.trim() && !userAbortedAiRef.current) {
        const fallbackController = new AbortController();
        aiAbortRef.current = fallbackController;
        const fallbackTimer = window.setTimeout(() => {
          fallbackController.abort();
        }, 20000);
        try {
          const fallbackRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: fallbackController.signal,
            body: JSON.stringify({ ...requestBody, stream: false }),
          });
          const fallbackJson = await fallbackRes.json().catch(() => ({}));
          if (!fallbackRes.ok || fallbackJson.error) {
            throw new Error(fallbackJson.error || `AI সার্ভার ত্রুটি (${fallbackRes.status})`);
          }
          if (typeof fallbackJson.reply === 'string' && fallbackJson.reply.trim()) {
            fullReply = fallbackJson.reply;
            modelUsed = fallbackJson.model || modelUsed;
            applyStreamText(fullReply, modelUsed);
          }
        } finally {
          clearTimeout(fallbackTimer);
        }
      }

      const finalized = updateMessageInThread(aiThreadsRef.current, threadId, assistantMsgId, (m) => ({
        ...m,
        text: fullReply || m.text || 'কোনো উত্তর পাওয়া যায়নি।',
        modelUsed: modelUsed || m.modelUsed,
      }));
      persistAiThreadList(finalized, threadId);
    } catch (err) {
      if (firstChunkWatchdog) {
        clearTimeout(firstChunkWatchdog);
        firstChunkWatchdog = undefined;
      }
      if ((err as Error)?.name === 'AbortError' && userAbortedAiRef.current) {
        persistAiThreadList(aiThreadsRef.current, threadId);
      } else {
        const errText = err instanceof Error ? err.message : 'AI সংযোগে সমস্যা হয়েছে।';
        setAiErrorMsg(errText);
        const withError = updateMessageInThread(aiThreadsRef.current, threadId, assistantMsgId, (m) => ({
          ...m,
          text: m.text || errText,
          isError: !m.text,
        }));
        persistAiThreadList(withError, threadId);
      }
    } finally {
      if (firstChunkWatchdog) clearTimeout(firstChunkWatchdog);
      aiAbortRef.current = null;
      isAiStreamingRef.current = false;
      setIsAiStreaming(false);
      setStreamingThreadId(null);
    }
  };

  // Admin Advertisements handlers
  const handlePublishAnnouncement = (newAd: AdminAnnouncement) => {
    setAnnouncements((prev) => {
      const updated = sortAnnouncementsNewestFirst([newAd, ...prev]);
      saveAnnouncementsToStorage(updated);
      return updated;
    });
    firestoreService.saveAnnouncement(newAd).catch(() => {});
  };

  const handleDeleteAnnouncement = (adId: string) => {
    setAnnouncements((prev) => {
      const updated = prev.filter((a) => a.id !== adId);
      saveAnnouncementsToStorage(updated);
      return updated;
    });
    firestoreService.deleteAnnouncement(adId).catch(() => {});
    setSyncToast('বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setSyncToast(null), 2600);
  };

  const handleMarkNotificationsRead = () => {
    const latestTs = announcements.reduce(
      (max, ad) => Math.max(max, Number(ad.createdTimestamp) || 0),
      Date.now()
    );
    setLastReadNotificationTs(latestTs);
    saveLastReadNotificationTs(latestTs);
  };

  const unreadNotificationsCount = getUnreadAnnouncementCount(
    announcements,
    lastReadNotificationTs
  );

  return (
    <PhoneContainer theme={theme}>
      {/* 1. Welcome / Auth Flow (Sign In & Sign Up) */}
      {screen === 'welcome-email' || screen === 'welcome-phone' ? (
        <WelcomeScreen
          websiteName={siteSettings.websiteName}
          logoUrl={siteSettings.logoUrl}
          registeredUsers={registeredUsers}
          hasRemoteUsers={hasRemoteUsers}
          onAccountIdsResolved={(ids) => {
            if (ids && ids.length > 0) {
              setExtraOwnerIds((prev) => Array.from(new Set([...prev, ...ids])));
            }
          }}
          onSuccess={handleAuthSuccess}
          onUserRegistered={(newU) => {
            setHasRemoteUsers(true);
            setRegisteredUsers((prev) => {
              if (prev.some((u) => u.id === newU.id)) return prev;
              return [newU, ...prev];
            });
          }}
        />
      ) : screen === 'admin-panel' ? (
        /* 2. Master Admin Control Panel */
        <AdminPanelScreen
          settings={siteSettings}
          users={registeredUsers}
          paymentRequests={paymentRequests}
          announcements={announcements}
          onSaveSettings={(updated) => {
            setSiteSettings(updated);
            try {
              localStorage.setItem('bashar_cloud_settings', JSON.stringify(updated));
            } catch {}
            firestoreService.saveSiteSettings(updated).catch(() => {});
            setStorage((prev) => ({ ...prev, totalGB: updated.totalStorageGB }));
          }}
          onDeleteUser={handleDeleteUser}
          onDeleteAllUsers={handleDeleteAllUsers}
          onClearUserFiles={handleClearUserFiles}
          onApprovePayment={handleApprovePayment}
          onRejectPayment={handleRejectPayment}
          onPublishAnnouncement={handlePublishAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'payment' ? (
        /* 3. bKash / Nagad 100 TK Lifetime Payment Screen */
        <PaymentScreen
          user={user}
          settings={siteSettings}
          subscription={subscription}
          existingPayment={paymentRequests.find(
            (p) =>
              (user.email && p.userEmail === user.email) ||
              (user.phone && p.senderPhone === user.phone) ||
              p.userId === (user.email || user.phone)
          )}
          onSubmitPayment={handleSubmitPayment}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'search' ? (
        /* 4. Search Screen with Per-User Persistent Recent Searches */
        <SearchScreen
          files={files}
          userId={canonicalUserId}
          isLocked={isAccountLocked}
          onOpenPayment={() => setScreen('payment')}
          onBack={() => setScreen('main')}
          onSelectFile={(f) => {
            if (!checkActionAllowed()) return;
            if (f.type === 'archive') {
              setSelectedZipFile(f);
              setIsZipModalOpen(true);
            } else if (f.type === 'audio') {
              setSelectedAudioFile(f);
            } else {
              setPreviewFile(f);
            }
          }}
        />
      ) : screen === 'notifications' ? (
        /* 5. Notifications Screen (Admin Advertisements & Notices) */
        <NotificationsScreen
          announcements={announcements}
          lastReadTimestamp={lastReadNotificationTs}
          onMarkAllRead={handleMarkNotificationsRead}
          theme={theme}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'storage-analysis' ? (
        /* 6. Storage Analysis Screen */
        <StorageAnalysisScreen
          storage={storage}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'edit-profile' ? (
        /* 7. Edit Profile Screen */
        <EditProfileScreen
          user={user}
          onBack={() => setScreen('main')}
          onSaveProfile={handleSaveProfile}
        />
      ) : screen === 'app-settings' ? (
        /* 8. App Settings Screen */
        <AppSettingsScreen
          onBack={() => setScreen('main')}
          onDeleteAccount={handleDeleteAccount}
          cloudSyncEnabled={cloudSyncEnabled}
          onToggleCloudSync={(enabled) => {
            setCloudSyncEnabled(enabled);
            if (enabled) {
              performSync(false);
            }
          }}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onTriggerSync={() => performSync(false)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          orbitPreset={orbitPreset}
          onChangeOrbitPreset={(preset) => handleChangeOrbitPreset(preset, true)}
          subscription={subscription}
          onOpenPayment={() => setScreen('payment')}
        />
      ) : (
        /* 9. Main Tabs (Home, Bashar Cloud Ai, Files, Favourites, Me) */
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
            {currentTab === 'home' && (
              <HomeScreen
                storage={storage}
                files={files}
                subscription={subscription}
                websiteName={siteSettings.websiteName}
                logoUrl={siteSettings.logoUrl}
                onOpenSearch={() => setScreen('search')}
                onOpenNotifications={() => setScreen('notifications')}
                unreadNotificationsCount={unreadNotificationsCount}
                onSelectCategory={handleSelectCategory}
                onOpenRecycleBin={() => {
                  if (checkActionAllowed()) setIsRecycleBinOpen(true);
                }}
                onOpenUpload={() => {
                  if (checkActionAllowed()) setIsFabOpen(true);
                }}
                onOpenAnalysis={() => setScreen('storage-analysis')}
                onOpenPayment={() => setScreen('payment')}
                onOpenCreateFile={() => {
                  if (checkActionAllowed()) setIsCreateFileOpen(true);
                }}
                onUploadMultipleFiles={handleUploadMultipleFiles}
                onOpenFilePreview={(f) => {
                  if (!checkActionAllowed()) return;
                  if (f.type === 'folder') {
                    setInitialFilesFilter('all');
                    setInitialFilesFolderId(f.id);
                    setCurrentTab('files');
                  } else if (f.type === 'audio') {
                    setSelectedAudioFile(f);
                  } else if (f.type === 'archive') {
                    setSelectedZipFile(f);
                    setIsZipModalOpen(true);
                  } else {
                    setPreviewFile(f);
                  }
                }}
                onViewAllFiles={() => {
                  setInitialFilesFilter('all');
                  setInitialFilesFolderId(null);
                  setCurrentTab('files');
                }}
              />
            )}

            {currentTab === 'ai' && (
              <BasharAiScreen
                threads={aiThreads}
                activeThreadId={activeAiThreadId || aiThreads[0]?.id || ''}
                userName={user.name}
                websiteName={siteSettings.websiteName}
                logoUrl={siteSettings.logoUrl}
                theme={theme}
                cloudFiles={files}
                onSelectThread={(id) => {
                  setActiveAiThreadId(id);
                  setAiErrorMsg(null);
                }}
                onCreateThread={handleCreateAiThread}
                onTogglePinThread={handleTogglePinAiThread}
                onRenameThread={handleRenameAiThread}
                onDeleteThread={handleDeleteAiThread}
                onChangeMode={handleChangeAiMode}
                onSendMessage={handleSendAiMessage}
                onStopStreaming={handleStopAiStreaming}
                isStreaming={isAiStreaming}
                streamingThreadId={streamingThreadId}
                errorMsg={aiErrorMsg}
                onClearError={() => setAiErrorMsg(null)}
                onSaveAnswerToCloud={(fileName, content) => {
                  handleCreateNewFile(fileName, 'document', content);
                }}
                onResolveCloudMedia={(f, opts) => resolveCloudMediaUrl(f, undefined, opts)}
              />
            )}

            {currentTab === 'files' && (
              <FilesScreen
                files={files}
                isLocked={isAccountLocked}
                onOpenPayment={() => setScreen('payment')}
                onOpenSearch={() => setScreen('search')}
                onToggleFavorite={handleToggleFavorite}
                onDeleteFile={handleDeleteFile}
                onDeletePermanently={handlePermanentDelete}
                onBulkDelete={handleBulkDelete}
                onBulkDeletePermanently={handleBulkPermanentDelete}
                onBulkFavorite={handleBulkFavorite}
                onBulkMove={handleBulkMove}
                onBulkCopy={handleBulkCopy}
                onRenameFile={handleRenameFile}
                onCopyFile={handleCopyFile}
                onMoveFile={handleMoveFile}
                onPlayAudio={(f) => {
                  if (checkActionAllowed()) setSelectedAudioFile(f);
                }}
                onOpenFilePreview={(f) => {
                  if (!checkActionAllowed()) return;
                  if (f.type === 'archive') {
                    setSelectedZipFile(f);
                    setIsZipModalOpen(true);
                  } else {
                    setPreviewFile(f);
                  }
                }}
                onUploadMultipleFiles={handleUploadMultipleFiles}
                onClearAllFiles={handleClearAllFiles}
                onRestoreVersion={handleRestoreFileVersion}
                onUploadNewVersion={handleUploadNewVersion}
                onResolveCloudMedia={(f, opts) => resolveCloudMediaUrl(f, undefined, opts)}
                initialFilter={initialFilesFilter}
                initialFolderId={initialFilesFolderId}
                onSelectionStateChange={setIsFilesBulkActive}
              />
            )}

            {currentTab === 'favourites' && (
              <FavouritesScreen
                files={files}
                isLocked={isAccountLocked}
                onOpenPayment={() => setScreen('payment')}
                onOpenSearch={() => setScreen('search')}
                onToggleFavorite={handleToggleFavorite}
                onPlayAudio={(f) => {
                  if (checkActionAllowed()) setSelectedAudioFile(f);
                }}
                onViewImage={(f) => {
                  if (checkActionAllowed()) setPreviewFile(f);
                }}
              />
            )}

            {currentTab === 'me' && (
              <ProfileScreen
                user={user}
                storage={storage}
                subscription={subscription}
                websiteName={siteSettings.websiteName}
                onOpenEditProfile={() => setScreen('edit-profile')}
                onOpenAppSettings={() => setScreen('app-settings')}
                onOpenAdminPanel={() => setScreen('admin-panel')}
                onOpenPayment={() => setScreen('payment')}
                onSignOut={() => {
                  sessionAuthenticatedRef.current = false;
                  lastSyncedMetaRef.current = null;
                  setExtraOwnerIds([]);
                  setUser(initialUserProfile);
                  setFiles([]);
                  setRecycleBin([]);
                  setStorage(initialStorageUsage);
                  storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
                  const fresh = createAiThread();
                  setAiThreads([fresh]);
                  setActiveAiThreadId(fresh.id);
                  liveObjectUrlsRef.current.forEach((blobUrl) => {
                    if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
                  });
                  liveObjectUrlsRef.current.clear();
                  chunkUploadingIdsRef.current.clear();
                  setScreen('welcome-email');
                  auth.signOut().catch(() => {});
                }}
                onOpenAnalysis={() => setScreen('storage-analysis')}
              />
            )}
          </div>

          {/* Floating Action Menu (Hidden on AI, Me, and Files select mode so bulk bar sits cleanly above bottom tabs) */}
          {currentTab !== 'me' && currentTab !== 'ai' && !(currentTab === 'files' && isFilesBulkActive) && (
            <FloatingActionMenu
              isOpen={isFabOpen}
              onToggle={() => {
                if (checkActionAllowed()) setIsFabOpen(!isFabOpen);
              }}
              onSelectAction={handleFabAction}
              onUploadFiles={handleUploadMultipleFiles}
              onUploadNativeFile={(file) => handleUploadMultipleFiles([file])}
            />
          )}

          {/* 5-Tab Bottom Navigation Bar */}
          <BottomNavBar
            currentTab={currentTab}
            onTabChange={(tab) => {
              if (tab === 'files' && currentTab !== 'files') {
                setInitialFilesFilter('all');
                setInitialFilesFolderId(null);
              }
              if (tab !== 'files') {
                setIsFilesBulkActive(false);
              }
              setCurrentTab(tab);
              setIsFabOpen(false);
            }}
          />
        </div>
      )}

      {/* Global Modals */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        isLocked={isAccountLocked}
        onOpenPayment={() => {
          setPreviewFile(null);
          setScreen('payment');
        }}
        onClose={() => setPreviewFile(null)}
        onToggleFavorite={handleToggleFavorite}
        onDeleteFile={handleDeleteFile}
        onDeletePermanently={handlePermanentDelete}
        onRenameFile={handleRenameFile}
        onCopyFile={handleCopyFile}
        onMoveFile={handleMoveFile}
        onResolveCloudMedia={(f, opts) => resolveCloudMediaUrl(f, undefined, opts)}
        availableFolders={files.filter((f) => f.type === 'folder')}
      />

      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        deletedFiles={recycleBin}
        onClose={() => setIsRecycleBinOpen(false)}
        onRestore={(f) => handleRestoreFile(f.id)}
        onEmptyBin={handleEmptyRecycleBin}
        onDeletePermanently={handlePermanentDelete}
      />

      <AudioPlayerModal
        file={selectedAudioFile}
        onClose={() => setSelectedAudioFile(null)}
        onResolveCloudMedia={(f, opts) => resolveCloudMediaUrl(f, undefined, opts)}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Create New File Modal ("ফাইল তৈরি করতে পারবে, ফাইলের নাম দিতে পারবে") */}
      <CreateFileModal
        isOpen={isCreateFileOpen}
        onClose={() => setIsCreateFileOpen(false)}
        onCreateFile={handleCreateNewFile}
      />

      {/* Rename File Modal ("ফাইলের নাম দিতে পারবে") */}
      <RenameFileModal
        file={fileToRename}
        isOpen={!!fileToRename}
        onClose={() => setFileToRename(null)}
        onRename={handleRenameFile}
      />

      {/* ZIP Archive Inspector & Extractor Modal ("জিপ ফাইল আপলোড করতে পারবে") */}
      <ZipArchiveModal
        file={selectedZipFile}
        isOpen={isZipModalOpen}
        isLocked={isAccountLocked}
        onOpenPayment={() => {
          setIsZipModalOpen(false);
          setSelectedZipFile(null);
          setScreen('payment');
        }}
        onClose={() => {
          setIsZipModalOpen(false);
          setSelectedZipFile(null);
        }}
        onExtractAll={handleExtractZip}
      />

      {/* 4-Step Upload Flow Modal (1. Start Upload -> 2. Select Destination -> 3. Create Folder -> 4. Upload Progress) */}
      <UploadFlowModal
        isOpen={isUploadFlowOpen}
        initialFiles={pendingUploadFiles}
        user={user}
        logoUrl={siteSettings.logoUrl}
        websiteName={siteSettings.websiteName}
        existingFolders={files.filter((f) => f.type === 'folder')}
        onClose={() => {
          setIsUploadFlowOpen(false);
          setPendingUploadFiles([]);
        }}
        onFinishUpload={handleCommitUploadFlow}
        onSyncFileToCloud={syncSingleFileToCloud}
        onCreateFolder={handleCreateFolderFromUpload}
      />

      {/* Toast Feedback */}
      {syncToast && (
        <div className="absolute bottom-20 left-4 right-4 bg-blue-600/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between z-50 animate-in fade-in slide-in-from-bottom-2">
          <span>{syncToast}</span>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-white/80 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </PhoneContainer>
  );
}
