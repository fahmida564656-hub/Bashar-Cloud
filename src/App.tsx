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
import { calculateSubscription } from './utils/subscription';
import { appendFileVersion, createInitialVersion } from './utils/fileVersioning';
import {
  buildCloudFileFromBrowserFile,
  compressImageToSafeDataUrl,
  hydrateCloudFiles,
  mergeCloudAndLocalFiles,
  computeStorageBreakdown,
  getFileBlob,
  deleteFileBlob,
  clearAllFileBlobs,
  copyFileBlob,
} from './utils/fileVault';
import { formatBytes } from './utils/uploadFlow';
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
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Payment Requests (Persisted in localStorage)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_payment_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Simulation states for tester to test expired trial and 90% storage warning
  const [simulatedExpired, setSimulatedExpired] = useState<boolean>(false);
  const [simulatedStorageWarning, setSimulatedStorageWarning] = useState<boolean>(false);

  // Modern Light / Dark Theme state with persistent localStorage
  const [theme, setTheme] = useState<AppTheme>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
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
  const [files, setFiles] = useState<CloudFile[]>(savedState.files || initialFiles);
  const [recycleBin, setRecycleBin] = useState<CloudFile[]>(savedState.recycleBin || initialRecycleBin);

  const filesRef = useRef<CloudFile[]>(files);
  const recycleBinRef = useRef<CloudFile[]>(recycleBin);
  filesRef.current = files;
  recycleBinRef.current = recycleBin;

  // Cloud Synchronization state
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    savedState.lastSync
      ? new Date(savedState.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Just now'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // View state
  const [isFabOpen, setIsFabOpen] = useState<boolean>(false);

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
  const aiAbortRef = useRef<AbortController | null>(null);

  // Helper to clean phone numbers
  const cleanPhone = (p?: string) => (p || '').replace(/[^0-9]/g, '').slice(-10);

  // Find active registered user record for subscription computation & cross-site file sync
  const currentUserRecord = registeredUsers.find(
    (u) =>
      (user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      (user.phone && cleanPhone(u.phone) === cleanPhone(user.phone))
  );

  const canonicalUserId =
    currentUserRecord?.id ||
    (user.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : '') ||
    (cleanPhone(user.phone) ? `phone_${cleanPhone(user.phone)}` : '') ||
    'guest_user';

  // Hydrate IndexedDB blobs on boot and whenever active user changes
  useEffect(() => {
    let cancelled = false;
    if (!hasExistingUser && (!canonicalUserId || canonicalUserId === 'guest_user')) {
      return;
    }

    const hydrateInitial = async () => {
      const scoped = storageProviderMock.loadMetadataState(
        canonicalUserId !== 'guest_user' ? canonicalUserId : undefined
      );
      const localFiles = scoped.files && scoped.files.length > 0 ? scoped.files : filesRef.current;
      const localBin = scoped.recycleBin && scoped.recycleBin.length > 0 ? scoped.recycleBin : recycleBinRef.current;

      const [hydratedFiles, hydratedBin] = await Promise.all([
        hydrateCloudFiles(localFiles),
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

  // Real-time synchronization of files & recycle bin for active user across websites
  useEffect(() => {
    if (!canonicalUserId || canonicalUserId === 'guest_user') return;
    let active = true;

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

    const unsub = firestoreService.subscribeToFiles(canonicalUserId, async (cloudFiles, meta) => {
      if (!active) return;
      if (cloudFiles.length > 0) {
        const merged = mergeCloudAndLocalFiles(cloudFiles, filesRef.current);
        const hydrated = await hydrateCloudFiles(merged);
        if (!active) return;
        setFiles(hydrated);
        const nextStorage = computeStorageBreakdown(hydrated, siteSettings.totalStorageGB || 1000);
        setStorage(nextStorage);
        storageProviderMock.saveMetadataState(hydrated, user, nextStorage, recycleBinRef.current, canonicalUserId);
      } else if (!meta?.fromCache && filesRef.current.length === 0) {
        setFiles([]);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, [canonicalUserId]);

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
      if (!active) return;
      if (cloudThreads.length > 0) {
        const merged = mergeAiThreads(cloudThreads, aiThreadsRef.current);
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

  // Subscription calculation (30 days free trial, then locked unless 100 TK lifetime is approved)
  const subscription = calculateSubscription(
    currentUserRecord?.registeredTimestamp,
    currentUserRecord?.isLifetimeApproved,
    currentUserRecord?.paymentStatus,
    simulatedExpired
  );

  const isAccountLocked = subscription.isExpired && !subscription.isLifetimeApproved;

  // Active storage with 90% limit simulation support
  const activeStorage: StorageUsage = simulatedStorageWarning
    ? {
        ...storage,
        usedGB: 920,
        imagesGB: 450,
        imagesCount: Math.max(storage.imagesCount, 42),
        videosGB: 380,
        videosCount: Math.max(storage.videosCount, 18),
        audiosMB: 90000,
        audiosCount: Math.max(storage.audiosCount, 12),
        docsMB: 2000,
        docsCount: Math.max(storage.docsCount, 5),
      }
    : storage;

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

  // Periodic synchronization effect
  useEffect(() => {
    if (!cloudSyncEnabled || screen !== 'main') return;

    const interval = setInterval(() => {
      performSync(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [cloudSyncEnabled, screen, files, recycleBin, user, storage, canonicalUserId]);

  // Verify Firebase Firestore & establish real-time cross-website data synchronization
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });

    // 1. Synchronize Registered Users across all websites/domains in real-time
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

    firestoreService.getRegisteredUsers().then((cloudUsers) => {
      if (cloudUsers !== undefined && cloudUsers !== null) {
        const unique = dedupeUserList(cloudUsers);
        setRegisteredUsers(unique);
        try {
          localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(unique));
        } catch {}
      }
    });

    const unsubscribeUsers = firestoreService.subscribeToRegisteredUsers((users) => {
      const safeUsers = dedupeUserList(users || []);
      setRegisteredUsers(safeUsers);
      try {
        localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(safeUsers));
      } catch {}
    });

    // 2. Synchronize Site Settings (logo, bKash & Nagad numbers) across all websites
    firestoreService.getSiteSettings().then((cloudSettings) => {
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

    // 3. Synchronize Payment Requests across all websites
    firestoreService.getPaymentRequests().then((cloudPayments) => {
      if (cloudPayments && cloudPayments.length > 0) {
        setPaymentRequests(cloudPayments);
        try {
          localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(cloudPayments));
        } catch {}
      }
    });

    const unsubscribePayments = firestoreService.subscribeToPaymentRequests((cloudPayments) => {
      if (cloudPayments && cloudPayments.length > 0) {
        setPaymentRequests(cloudPayments);
        try {
          localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(cloudPayments));
        } catch {}
      }
    });

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
      unsubscribeUsers();
      unsubscribeSettings();
      unsubscribePayments();
      unsubscribeAuth();
    };
  }, []);

  // Recalculate storage breakdown & persist across localStorage + scoped user vault + Firestore
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
          firestoreService.saveRegisteredUser(updatedRecord).catch(() => {});
          return updatedRecord;
        }
        return u;
      })
    );

    if (cloudSyncEnabled && targetUid && targetUid !== 'guest_user') {
      firestoreService.saveStorageUsage(targetUid, newStorage).catch(() => {});
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
    destinationFolderId?: string | null
  ) => {
    if (!checkActionAllowed()) return;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

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

    const updated = [...finalizedFiles, ...filesRef.current];
    setFiles(updated);
    persistVaultState(updated);

    await Promise.all(
      finalizedFiles.map((f) =>
        firestoreService.saveFile(canonicalUserId, f).catch(() => {})
      )
    );

    setInitialFilesFilter('all');
    setInitialFilesFolderId(destinationFolderId ?? null);
    setCurrentTab('files');
    setSyncToast(`সফলভাবে ${finalizedFiles.length}টি ফাইল সুরক্ষিতভাবে সেভ হয়েছে!`);
    setTimeout(() => setSyncToast(null), 3500);
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
    const updatedFiles = filesRef.current.filter((f) => f.id !== id);
    const updatedRecycle = recycleBinRef.current.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    persistVaultState(updatedFiles, updatedRecycle);

    deleteFileBlob(id).catch(() => {});
    firestoreService.deleteFile(canonicalUserId, id).catch(() => {});
    firestoreService.removeDeletedFile(canonicalUserId, id).catch(() => {});
  };

  // Bulk Permanent Delete
  const handleBulkPermanentDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const updatedFiles = filesRef.current.filter((f) => !idSet.has(f.id));
    const updatedRecycle = recycleBinRef.current.filter((f) => !idSet.has(f.id));
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    persistVaultState(updatedFiles, updatedRecycle);

    ids.forEach((id) => {
      deleteFileBlob(id).catch(() => {});
      firestoreService.deleteFile(canonicalUserId, id).catch(() => {});
      firestoreService.removeDeletedFile(canonicalUserId, id).catch(() => {});
    });
  };

  // Bulk Delete to Recycle Bin
  const handleBulkDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
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

    const updated = filesRef.current.map((f) => {
      if (f.id === targetFile.id) {
        const reuploaded = appendFileVersion(
          {
            ...f,
            url: rebuilt.url,
            thumbnail: rebuilt.thumbnail,
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
        firestoreService.saveFile(canonicalUserId, reuploaded).catch(() => {});
        return reuploaded;
      }
      return f;
    });

    setFiles(updated);
    persistVaultState(updated);
    setSyncToast('নতুন ভার্সন সফলভাবে ক্লাউডে আপলোড ও সংরক্ষিত হয়েছে!');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Restore from Recycle Bin
  const handleRestoreFile = (id: string) => {
    const fileToRestore = recycleBinRef.current.find((f) => f.id === id);
    if (!fileToRestore) return;

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
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      const remaining = registeredUsers.filter((u) => u.id !== userId);
      localStorage.setItem('bashar_cloud_registered_users', JSON.stringify(remaining));
    } catch {}
    storageProviderMock.clearUserLocalVault(userId);
    await firestoreService.deleteRegisteredUserAndData(userId).catch(() => {});

    // If currently active user was deleted, log out and reset session to clean slate
    const isCurrent =
      canonicalUserId === userId ||
      (userToDelete && (
        (user.email && user.email.toLowerCase() === userToDelete.email.toLowerCase()) ||
        (user.phone && cleanPhone(user.phone) === cleanPhone(userToDelete.phone))
      ));

    if (isCurrent) {
      setUser(initialUserProfile);
      setFiles([]);
      setRecycleBin([]);
      setStorage(initialStorageUsage);
      storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
      clearAiThreadsFromStorage(canonicalUserId);
      const resetChat = createAiThread();
      setAiThreads([resetChat]);
      setActiveAiThreadId(resetChat.id);
      await clearAllFileBlobs().catch(() => {});
      setScreen('welcome-email');
      auth.signOut().catch(() => {});
    }
    setSyncToast('অ্যাকাউন্ট ও সমস্ত ডাটা সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Delete all accounts and data completely
  const handleDeleteAllUsers = async () => {
    registeredUsers.forEach((u) => storageProviderMock.clearUserLocalVault(u.id));
    setRegisteredUsers([]);
    try {
      localStorage.removeItem('bashar_cloud_registered_users');
    } catch {}
    await firestoreService.deleteAllRegisteredAccounts().catch(() => {});
    await clearAllFileBlobs().catch(() => {});

    setUser(initialUserProfile);
    setFiles([]);
    setRecycleBin([]);
    setStorage(initialStorageUsage);
    storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
    setScreen('welcome-email');
    auth.signOut().catch(() => {});
    setSyncToast('সকল অ্যাকাউন্ট ও ক্লাউড ডাটা সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Clear all files for a specific user
  const handleClearUserFiles = async (userId: string) => {
    storageProviderMock.clearUserLocalVault(userId);
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
    setUser(initialUserProfile);
    setFiles([]);
    setRecycleBin([]);
    setStorage(initialStorageUsage);
    storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
    setScreen('welcome-email');
    auth.signOut().catch(() => {});
  };

  // Handle successful sign in / sign up (universal cross-website sync + loss-proof restoration)
  const handleAuthSuccess = async (
    authenticatedUser: UserProfile,
    passwordPlain?: string,
    cloudRecord?: RegisteredUser
  ) => {
    setUser(authenticatedUser);

    const existingIndex = registeredUsers.findIndex(
      (u) =>
        (cloudRecord && u.id === cloudRecord.id) ||
        (authenticatedUser.email && u.email.toLowerCase() === authenticatedUser.email.toLowerCase()) ||
        (authenticatedUser.phone && cleanPhone(u.phone) === cleanPhone(authenticatedUser.phone))
    );

    const prevUser = existingIndex >= 0 ? registeredUsers[existingIndex] : cloudRecord;

    const userRecord: RegisteredUser = {
      id: prevUser?.id || cloudRecord?.id || `user-${Date.now()}`,
      name: authenticatedUser.name || (authenticatedUser.email ? authenticatedUser.email.split('@')[0] : 'User'),
      email: authenticatedUser.email,
      phone: authenticatedUser.phone,
      passwordPlain: passwordPlain || prevUser?.passwordPlain || cloudRecord?.passwordPlain || '••••••••',
      avatarUrl: authenticatedUser.avatarUrl || prevUser?.avatarUrl || cloudRecord?.avatarUrl,
      registeredAt:
        prevUser?.registeredAt ||
        cloudRecord?.registeredAt ||
        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      registeredTimestamp:
        prevUser?.registeredTimestamp || cloudRecord?.registeredTimestamp || Date.now(),
      filesCount: prevUser?.filesCount || (existingIndex >= 0 ? filesRef.current.length : 0),
      storageUsedMB: prevUser?.storageUsedMB || (existingIndex >= 0 ? Math.round(storage.usedGB * 1024) : 0),
      isLifetimeApproved: prevUser?.isLifetimeApproved ?? cloudRecord?.isLifetimeApproved ?? false,
      paymentStatus: prevUser?.paymentStatus || cloudRecord?.paymentStatus || 'none',
      lastTrxId: prevUser?.lastTrxId || cloudRecord?.lastTrxId || '',
    };

    // Save to Firestore so user is available across all websites instantly
    await firestoreService.saveRegisteredUser(userRecord).catch(() => {});

    if (existingIndex >= 0) {
      setRegisteredUsers((prev) => prev.map((u, i) => (i === existingIndex ? userRecord : u)));
    } else {
      setRegisteredUsers((prev) => [userRecord, ...prev]);
    }

    // Load scoped local vault & Firestore cloud files + recycle bin
    const scopedLocal = storageProviderMock.loadMetadataState(userRecord.id);
    const localFiles = scopedLocal.files || [];
    const localBin = scopedLocal.recycleBin || [];

    const fallbackIds = [
      userRecord.email ? userRecord.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : '',
      userRecord.email || '',
      cleanPhone(userRecord.phone) ? `phone_${cleanPhone(userRecord.phone)}` : '',
      cleanPhone(userRecord.phone) || '',
    ].filter(Boolean);

    try {
      const [cloudFiles, cloudBin] = await Promise.all([
        firestoreService.getUserFiles(userRecord.id, fallbackIds),
        firestoreService.getUserDeletedFiles(userRecord.id),
      ]);

      const mergedFiles =
        cloudFiles && cloudFiles.length > 0
          ? mergeCloudAndLocalFiles(cloudFiles, localFiles)
          : localFiles;
      const mergedBin =
        cloudBin && cloudBin.length > 0
          ? mergeCloudAndLocalFiles(cloudBin, localBin)
          : localBin;

      const [hydratedFiles, hydratedBin] = await Promise.all([
        hydrateCloudFiles(mergedFiles),
        hydrateCloudFiles(mergedBin),
      ]);

      setFiles(hydratedFiles);
      setRecycleBin(hydratedBin);
      const nextStorage = computeStorageBreakdown(hydratedFiles, siteSettings.totalStorageGB || 1000);
      setStorage(nextStorage);
      storageProviderMock.saveMetadataState(
        hydratedFiles,
        authenticatedUser,
        nextStorage,
        hydratedBin,
        userRecord.id
      );

      hydratedFiles.forEach((cf) => {
        firestoreService.saveFile(userRecord.id, cf).catch(() => {});
      });
    } catch {
      const hydratedLocal = await hydrateCloudFiles(localFiles);
      const hydratedBin = await hydrateCloudFiles(localBin);
      setFiles(hydratedLocal);
      setRecycleBin(hydratedBin);
      const nextStorage = computeStorageBreakdown(hydratedLocal, siteSettings.totalStorageGB || 1000);
      setStorage(nextStorage);
      storageProviderMock.saveMetadataState(
        hydratedLocal,
        authenticatedUser,
        nextStorage,
        hydratedBin,
        userRecord.id
      );
    }

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
      setIsAiStreaming(false);
      setStreamingThreadId(null);
    }

    let remaining = deleteAiThread(aiThreadsRef.current, threadId);
    if (remaining.length === 0) {
      const fresh = createAiThread();
      remaining = [fresh];
    }
    const sorted = sortAiThreads(remaining);
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
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }
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
    const priorHistory = (currentThread?.messages || [])
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

    const assistantMsgId = `msg-a-${now + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const assistantPlaceholder: AiMessage = {
      id: assistantMsgId,
      role: 'model',
      text: '',
      createdAt: now + 1,
      mode,
    };

    let nextThreads = appendMessageToThread(aiThreadsRef.current, threadId, userMsg);
    nextThreads = appendMessageToThread(nextThreads, threadId, assistantPlaceholder);
    persistAiThreadList(nextThreads, threadId);

    const controller = new AbortController();
    aiAbortRef.current = controller;
    setIsAiStreaming(true);
    setStreamingThreadId(threadId);
    setAiErrorMsg(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
          mode,
          userName: user.name,
          attachment: attachment ? { name: attachment.name, snippet: attachment.snippet } : null,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok && !contentType.includes('text/event-stream')) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `AI সার্ভার ত্রুটি (${response.status})`);
      }

      if (!response.body) {
        throw new Error('স্ট্রিম রেসপন্স পাওয়া যায়নি।');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullReply = '';
      let modelUsed = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());
          if (dataLines.length === 0) continue;

          let parsed: { type?: string; text?: string; model?: string; error?: string } | null = null;
          try {
            parsed = JSON.parse(dataLines.join('\n'));
          } catch {
            continue;
          }

          if (!parsed) continue;
          if (parsed.type === 'meta' && parsed.model) {
            modelUsed = parsed.model;
          } else if (parsed.type === 'chunk' && parsed.text) {
            fullReply += parsed.text;
            modelUsed = parsed.model || modelUsed;
            const updated = updateMessageInThread(aiThreadsRef.current, threadId, assistantMsgId, (m) => ({
              ...m,
              text: fullReply,
              modelUsed: modelUsed || m.modelUsed,
            }));
            setAiThreads(updated);
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error || 'AI উত্তর তৈরিতে সমস্যা হয়েছে।');
          }
        }
      }

      const finalized = updateMessageInThread(aiThreadsRef.current, threadId, assistantMsgId, (m) => ({
        ...m,
        text: fullReply || m.text || 'কোনো উত্তর পাওয়া যায়নি।',
        modelUsed: modelUsed || m.modelUsed,
      }));
      persistAiThreadList(finalized, threadId);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
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
      aiAbortRef.current = null;
      setIsAiStreaming(false);
      setStreamingThreadId(null);
    }
  };

  return (
    <PhoneContainer theme={theme}>
      {/* 1. Welcome / Auth Flow (Sign In & Sign Up) */}
      {screen === 'welcome-email' || screen === 'welcome-phone' ? (
        <WelcomeScreen
          websiteName={siteSettings.websiteName}
          logoUrl={siteSettings.logoUrl}
          registeredUsers={registeredUsers}
          onSuccess={handleAuthSuccess}
          onUserRegistered={(newU) => {
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
        /* 4. Search Screen with Persistent Recent Searches */
        <SearchScreen
          files={files}
          onBack={() => setScreen('main')}
          onSelectFile={(f) => {
            if (!checkActionAllowed()) return;
            if (f.type === 'audio') setSelectedAudioFile(f);
            else setPreviewFile(f);
          }}
        />
      ) : screen === 'notifications' ? (
        /* 5. Notifications Screen */
        <NotificationsScreen onBack={() => setScreen('main')} />
      ) : screen === 'storage-analysis' ? (
        /* 6. Storage Analysis Screen */
        <StorageAnalysisScreen
          storage={activeStorage}
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
        /* 8. App Settings Screen with Expiration & 90% Storage Warning Simulation */
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
          simulatedExpired={simulatedExpired}
          onToggleSimulatedExpired={(exp) => setSimulatedExpired(exp)}
          simulatedStorageWarning={simulatedStorageWarning}
          onToggleSimulatedStorageWarning={(warn) => setSimulatedStorageWarning(warn)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      ) : (
        /* 9. Main Tabs (Home, Bashar Cloud Ai, Files, Favourites, Me) */
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
            {currentTab === 'home' && (
              <HomeScreen
                storage={activeStorage}
                files={files}
                subscription={subscription}
                websiteName={siteSettings.websiteName}
                logoUrl={siteSettings.logoUrl}
                onOpenSearch={() => setScreen('search')}
                onOpenNotifications={() => setScreen('notifications')}
                onSelectCategory={handleSelectCategory}
                onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
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
                initialFilter={initialFilesFilter}
                initialFolderId={initialFilesFolderId}
              />
            )}

            {currentTab === 'favourites' && (
              <FavouritesScreen
                files={files}
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
                storage={activeStorage}
                subscription={subscription}
                websiteName={siteSettings.websiteName}
                onOpenEditProfile={() => setScreen('edit-profile')}
                onOpenAppSettings={() => setScreen('app-settings')}
                onOpenAdminPanel={() => setScreen('admin-panel')}
                onOpenPayment={() => setScreen('payment')}
                onSignOut={() => {
                  setUser(initialUserProfile);
                  setFiles([]);
                  setRecycleBin([]);
                  setStorage(initialStorageUsage);
                  storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage, []);
                  const fresh = createAiThread();
                  setAiThreads([fresh]);
                  setActiveAiThreadId(fresh.id);
                  setScreen('welcome-email');
                  auth.signOut().catch(() => {});
                }}
                onOpenAnalysis={() => setScreen('storage-analysis')}
              />
            )}
          </div>

          {/* Floating Action Menu (Positioned low on Home, Files, Favourites; hidden on AI & Me) */}
          {currentTab !== 'me' && currentTab !== 'ai' && (
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
        onClose={() => setPreviewFile(null)}
        onToggleFavorite={handleToggleFavorite}
        onDeleteFile={handleDeleteFile}
        onDeletePermanently={handlePermanentDelete}
        onRenameFile={handleRenameFile}
        onCopyFile={handleCopyFile}
        onMoveFile={handleMoveFile}
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
