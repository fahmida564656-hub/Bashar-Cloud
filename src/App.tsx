/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import {
  RecycleBinModal,
  AudioPlayerModal,
  NewFolderModal,
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
import {
  MainTab,
  ScreenMode,
  CloudFile,
  UserProfile,
  StorageUsage,
  FileType,
  SiteSettings,
  RegisteredUser,
  PaymentRequest,
  PaymentStatus,
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

  // Screen and Tab state - starts on Welcome / Sign In / Sign Up
  const [screen, setScreen] = useState<ScreenMode>(hasExistingUser ? 'main' : 'welcome-email');
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [initialFilesFilter, setInitialFilesFilter] = useState<string>('all');

  // User, Storage & Files state - starts with clean 0 B / 1000 GB, no demo files
  const [user, setUser] = useState<UserProfile>(
    hasExistingUser ? savedState.user! : initialUserProfile
  );
  const [storage, setStorage] = useState<StorageUsage>(() => {
    const base = savedState.storage || initialStorageUsage;
    return { ...base, totalGB: siteSettings.totalStorageGB || 1000 };
  });
  const [files, setFiles] = useState<CloudFile[]>(savedState.files || initialFiles);
  const [recycleBin, setRecycleBin] = useState<CloudFile[]>(initialRecycleBin);

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
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);

  // Find active registered user record for subscription computation
  const currentUserRecord = registeredUsers.find(
    (u) =>
      (user.email && u.email === user.email) ||
      (user.phone && u.phone === user.phone)
  );

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

  // Trigger synchronization with storage provider mock & Firestore
  const performSync = async (silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await storageProviderMock.syncWithProvider(files, user, storage);
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
    if (!cloudSyncEnabled) return;

    const interval = setInterval(() => {
      performSync(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [cloudSyncEnabled, files, user, storage]);

  // Verify Firebase Firestore on startup
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !user.email) {
        setUser((prev) => ({
          ...prev,
          email: firebaseUser.email || prev.email,
          name: firebaseUser.displayName || prev.name,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Recalculate storage breakdown dynamically
  const updateStorage = (updatedFiles: CloudFile[]) => {
    let imagesBytes = 0;
    let imagesCount = 0;
    let videosBytes = 0;
    let videosCount = 0;
    let audiosBytes = 0;
    let audiosCount = 0;
    let docsBytes = 0;
    let docsCount = 0;

    updatedFiles.forEach((file) => {
      if (file.type === 'image') {
        imagesBytes += file.sizeBytes;
        imagesCount++;
      } else if (file.type === 'video') {
        videosBytes += file.sizeBytes;
        videosCount++;
      } else if (file.type === 'audio') {
        audiosBytes += file.sizeBytes;
        audiosCount++;
      } else if (file.type === 'document') {
        docsBytes += file.sizeBytes;
        docsCount++;
      }
    });

    const totalBytes = imagesBytes + videosBytes + audiosBytes + docsBytes;
    const usedGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));

    const newStorage: StorageUsage = {
      totalGB: siteSettings.totalStorageGB || 1000,
      usedGB,
      imagesGB: Number((imagesBytes / (1024 * 1024 * 1024)).toFixed(2)),
      imagesCount,
      videosGB: Number((videosBytes / (1024 * 1024 * 1024)).toFixed(2)),
      videosCount,
      audiosMB: Math.round(audiosBytes / (1024 * 1024)),
      audiosCount,
      docsMB: Math.round(docsBytes / (1024 * 1024)),
      docsCount,
    };

    setStorage(newStorage);
    storageProviderMock.saveMetadataState(updatedFiles, user, newStorage);

    // Update current user's file count & storage in registeredUsers directory
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if ((u.email && u.email === user.email) || (u.phone && u.phone === user.phone)) {
          return {
            ...u,
            filesCount: updatedFiles.length,
            storageUsedMB: Math.round(usedGB * 1024),
          };
        }
        return u;
      })
    );

    if (cloudSyncEnabled) {
      firestoreService.saveStorageUsage(user.email || user.phone || 'guest', newStorage).catch(() => {});
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

  // Upload multiple native files at once
  const handleUploadMultipleFiles = (uploadedFiles: File[]) => {
    if (!checkActionAllowed()) return;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newCloudFiles: CloudFile[] = uploadedFiles.map((f, index) => {
      let type: FileType = 'document';
      if (f.type.startsWith('image/')) type = 'image';
      else if (f.type.startsWith('video/')) type = 'video';
      else if (f.type.startsWith('audio/')) type = 'audio';

      const sizeMB = f.size / (1024 * 1024);
      const formattedSize = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`;

      let url: string | undefined = undefined;
      if (type === 'image' || type === 'audio') {
        try {
          url = URL.createObjectURL(f);
        } catch {}
      }

      return {
        id: `upload-${Date.now()}-${index}`,
        name: f.name,
        type,
        sizeBytes: f.size,
        formattedSize,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isFavorite: false,
        url,
      };
    });

    const updated = [...newCloudFiles, ...files];
    setFiles(updated);
    updateStorage(updated);
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    const updated = files.map((f) => (f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
  };

  // Bulk Favorite
  const handleBulkFavorite = (ids: string[], makeFavorite: boolean) => {
    const idSet = new Set(ids);
    const updated = files.map((f) => (idSet.has(f.id) ? { ...f, isFavorite: makeFavorite } : f));
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
  };

  // Move file to Recycle Bin
  const handleDeleteFile = (id: string) => {
    if (!checkActionAllowed()) return;
    const fileToDelete = files.find((f) => f.id === id);
    if (!fileToDelete) return;

    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    setRecycleBin((prev) => [fileToDelete, ...prev]);
    updateStorage(updatedFiles);
  };

  // Permanent Delete (সারা জীবনের জন্য ডিলিট)
  const handlePermanentDelete = (id: string) => {
    if (!checkActionAllowed()) return;
    const updatedFiles = files.filter((f) => f.id !== id);
    const updatedRecycle = recycleBin.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    updateStorage(updatedFiles);
  };

  // Bulk Permanent Delete (সারা জীবনের জন্য ডিলিট)
  const handleBulkPermanentDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const updatedFiles = files.filter((f) => !idSet.has(f.id));
    const updatedRecycle = recycleBin.filter((f) => !idSet.has(f.id));
    setFiles(updatedFiles);
    setRecycleBin(updatedRecycle);
    updateStorage(updatedFiles);
  };

  // Bulk Delete to Recycle Bin
  const handleBulkDelete = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const filesToDelete = files.filter((f) => idSet.has(f.id));
    const updatedFiles = files.filter((f) => !idSet.has(f.id));

    setFiles(updatedFiles);
    setRecycleBin((prev) => [...filesToDelete, ...prev]);
    updateStorage(updatedFiles);
  };

  // Bulk Move files to a destination folder
  const handleBulkMove = (ids: string[], destinationFolderId: string | null) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const updated = files.map((f) => (idSet.has(f.id) ? { ...f, parentFolderId: destinationFolderId } : f));
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
  };

  // Bulk Copy files
  const handleBulkCopy = (ids: string[]) => {
    if (!checkActionAllowed()) return;
    const idSet = new Set(ids);
    const filesToCopy = files.filter((f) => idSet.has(f.id));
    const copies: CloudFile[] = filesToCopy.map((f) => ({
      ...f,
      id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${f.name} (Copy)`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    const updated = [...copies, ...files];
    setFiles(updated);
    updateStorage(updated);
  };

  // Single Copy file
  const handleCopyFile = (file: CloudFile) => {
    if (!checkActionAllowed()) return;
    const copy: CloudFile = {
      ...file,
      id: `copy-${Date.now()}`,
      name: `${file.name} (Copy)`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    const updated = [copy, ...files];
    setFiles(updated);
    updateStorage(updated);
  };

  // Single Move file
  const handleMoveFile = (id: string, destinationFolderId: string | null) => {
    if (!checkActionAllowed()) return;
    const updated = files.map((f) => (f.id === id ? { ...f, parentFolderId: destinationFolderId } : f));
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
  };

  // Rename a file or folder
  const handleRenameFile = (id: string, newName: string) => {
    if (!checkActionAllowed()) return;
    const updated = files.map((f) => (f.id === id ? { ...f, name: newName } : f));
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
    if (previewFile && previewFile.id === id) {
      setPreviewFile({ ...previewFile, name: newName });
    }
  };

  // Restore from Recycle Bin
  const handleRestoreFile = (id: string) => {
    const fileToRestore = recycleBin.find((f) => f.id === id);
    if (!fileToRestore) return;

    setRecycleBin((prev) => prev.filter((f) => f.id !== id));
    const updated = [fileToRestore, ...files];
    setFiles(updated);
    updateStorage(updated);
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = () => {
    setRecycleBin([]);
  };

  // Create New Folder
  const handleCreateFolder = (folderName: string) => {
    if (!checkActionAllowed()) return;
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      sizeBytes: 0,
      formattedSize: '0 items',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isFavorite: false,
      itemCount: 0,
    };

    const updated = [newFolder, ...files];
    setFiles(updated);
    storageProviderMock.saveMetadataState(updated, user, storage);
    setIsNewFolderOpen(false);
  };

  // Category selection navigation
  const handleSelectCategory = (type: FileType) => {
    setInitialFilesFilter(type);
    setCurrentTab('files');
  };

  // FAB action handler
  const handleFabAction = (action: string) => {
    setIsFabOpen(false);
    if (!checkActionAllowed()) return;

    if (action === 'folder') {
      setIsNewFolderOpen(true);
    } else if (action === 'scan') {
      handleCreateFolder(`Scanned Docs ${new Date().toLocaleDateString()}`);
    }
  };

  // Save Profile Changes (Updates user & registeredUsers list)
  const handleSaveProfile = (updatedProfile: Partial<UserProfile>) => {
    setUser((prev) => {
      const merged: UserProfile = {
        name: updatedProfile.name !== undefined ? updatedProfile.name : prev.name,
        phone: updatedProfile.phone !== undefined ? updatedProfile.phone : prev.phone,
        email: updatedProfile.email !== undefined ? updatedProfile.email : prev.email,
        avatarUrl: updatedProfile.avatarUrl !== undefined ? updatedProfile.avatarUrl : prev.avatarUrl,
      };
      storageProviderMock.saveMetadataState(files, merged, storage);
      return merged;
    });

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          (user.email && u.email === user.email) ||
          (user.phone && u.phone === user.phone) ||
          (updatedProfile.email && u.email === updatedProfile.email)
        ) {
          return {
            ...u,
            name: updatedProfile.name !== undefined ? updatedProfile.name : u.name,
            email: updatedProfile.email !== undefined ? updatedProfile.email : u.email,
            phone: updatedProfile.phone !== undefined ? updatedProfile.phone : u.phone,
            avatarUrl: updatedProfile.avatarUrl !== undefined ? updatedProfile.avatarUrl : u.avatarUrl,
          };
        }
        return u;
      })
    );
  };

  const handleDeleteAccount = () => {
    setUser(initialUserProfile);
    setFiles([]);
    setStorage(initialStorageUsage);
    storageProviderMock.saveMetadataState([], initialUserProfile, initialStorageUsage);
    setScreen('welcome-email');
    auth.signOut().catch(() => {});
  };

  // Handle successful sign in / sign up
  const handleAuthSuccess = (authenticatedUser: UserProfile, passwordPlain?: string) => {
    setUser(authenticatedUser);

    const existingIndex = registeredUsers.findIndex(
      (u) =>
        (authenticatedUser.email && u.email === authenticatedUser.email) ||
        (authenticatedUser.phone && u.phone === authenticatedUser.phone)
    );

    const userRecord: RegisteredUser = {
      id: existingIndex >= 0 ? registeredUsers[existingIndex].id : `user-${Date.now()}`,
      name: authenticatedUser.name || (authenticatedUser.email ? authenticatedUser.email.split('@')[0] : 'User'),
      email: authenticatedUser.email,
      phone: authenticatedUser.phone,
      passwordPlain: passwordPlain || (existingIndex >= 0 ? registeredUsers[existingIndex].passwordPlain : '••••••••'),
      avatarUrl: authenticatedUser.avatarUrl,
      registeredAt:
        existingIndex >= 0
          ? registeredUsers[existingIndex].registeredAt
          : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      registeredTimestamp:
        existingIndex >= 0 && registeredUsers[existingIndex].registeredTimestamp
          ? registeredUsers[existingIndex].registeredTimestamp
          : Date.now(),
      filesCount: existingIndex >= 0 ? files.length : 0,
      storageUsedMB: existingIndex >= 0 ? Math.round(storage.usedGB * 1024) : 0,
      isLifetimeApproved: existingIndex >= 0 ? registeredUsers[existingIndex].isLifetimeApproved : false,
      paymentStatus: existingIndex >= 0 ? registeredUsers[existingIndex].paymentStatus : 'none',
    };

    if (existingIndex >= 0) {
      setRegisteredUsers((prev) => prev.map((u, i) => (i === existingIndex ? userRecord : u)));
    } else {
      // New account starts with 0 files clean slate
      setFiles([]);
      setRecycleBin([]);
      setStorage(initialStorageUsage);
      storageProviderMock.saveMetadataState([], authenticatedUser, initialStorageUsage);
      setRegisteredUsers((prev) => [userRecord, ...prev]);
    }

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

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if ((u.email && u.email === user.email) || (u.phone && u.phone === user.phone)) {
          return {
            ...u,
            paymentStatus: 'pending',
            lastTrxId: paymentData.transactionId,
          };
        }
        return u;
      })
    );
  };

  // Approve payment: unlocks user for lifetime access
  const handleApprovePayment = (paymentId: string) => {
    const targetReq = paymentRequests.find((p) => p.id === paymentId);
    if (!targetReq) return;

    setPaymentRequests((prev) => {
      const updated = prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: 'approved' as PaymentStatus, reviewedAt: new Date().toLocaleString() }
          : p
      );
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          u.id === targetReq.userId ||
          (targetReq.userEmail && u.email === targetReq.userEmail) ||
          (targetReq.userPhone && u.phone === targetReq.userPhone) ||
          (targetReq.senderPhone && u.phone === targetReq.senderPhone)
        ) {
          return {
            ...u,
            isLifetimeApproved: true,
            paymentStatus: 'approved',
          };
        }
        return u;
      })
    );
  };

  // Reject payment: marks status rejected
  const handleRejectPayment = (paymentId: string) => {
    const targetReq = paymentRequests.find((p) => p.id === paymentId);
    if (!targetReq) return;

    setPaymentRequests((prev) => {
      const updated = prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: 'rejected' as PaymentStatus, reviewedAt: new Date().toLocaleString() }
          : p
      );
      try {
        localStorage.setItem('bashar_cloud_payment_requests', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (
          u.id === targetReq.userId ||
          (targetReq.userEmail && u.email === targetReq.userEmail) ||
          (targetReq.userPhone && u.phone === targetReq.userPhone) ||
          (targetReq.senderPhone && u.phone === targetReq.senderPhone)
        ) {
          return {
            ...u,
            paymentStatus: 'rejected',
          };
        }
        return u;
      })
    );
  };

  return (
    <PhoneContainer>
      {/* 1. Welcome / Auth Flow (Sign In & Sign Up) */}
      {screen === 'welcome-email' || screen === 'welcome-phone' ? (
        <WelcomeScreen
          websiteName={siteSettings.websiteName}
          logoUrl={siteSettings.logoUrl}
          registeredUsers={registeredUsers}
          onSuccess={handleAuthSuccess}
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
            setStorage((prev) => ({ ...prev, totalGB: updated.totalStorageGB }));
          }}
          onDeleteUser={(userId) => {
            setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
          }}
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
        />
      ) : (
        /* 9. Main Tabs (Home, Files, Favourites, Me) */
        <div className="flex-1 flex flex-col justify-between relative overflow-y-auto">
          {currentTab === 'home' && (
            <HomeScreen
              storage={activeStorage}
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
              onUploadMultipleFiles={handleUploadMultipleFiles}
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
                if (checkActionAllowed()) setPreviewFile(f);
              }}
              onUploadMultipleFiles={handleUploadMultipleFiles}
              initialFilter={initialFilesFilter}
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
                storageProviderMock.saveMetadataState(files, initialUserProfile, storage);
                setScreen('welcome-email');
                auth.signOut().catch(() => {});
              }}
              onOpenAnalysis={() => setScreen('storage-analysis')}
            />
          )}

          {/* Floating Action Menu (Available on Home, Files, Favourites) */}
          {currentTab !== 'me' && (
            <FloatingActionMenu
              isOpen={isFabOpen}
              onToggle={() => {
                if (checkActionAllowed()) setIsFabOpen(!isFabOpen);
              }}
              onSelectAction={handleFabAction}
              onUploadNativeFile={(file) => handleUploadMultipleFiles([file])}
            />
          )}

          {/* Bottom Navigation Bar */}
          <BottomNavBar
            currentTab={currentTab}
            onTabChange={(tab) => {
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
