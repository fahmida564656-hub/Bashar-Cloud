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
import {
  MainTab,
  ScreenMode,
  CloudFile,
  UserProfile,
  StorageUsage,
  FileType,
  SiteSettings,
  RegisteredUser,
} from './types';

export default function App() {
  const savedState = storageProviderMock.loadMetadataState();
  const hasExistingUser = !!(savedState.user && (savedState.user.name || savedState.user.email));

  // Site Settings (Default: Bashar Cloud, 1000 GB)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('bashar_cloud_settings');
      if (saved) return JSON.parse(saved);
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

  // Persist state on state updates when cloud sync is enabled
  useEffect(() => {
    if (cloudSyncEnabled) {
      storageProviderMock.saveMetadataState(files, user, storage);
    }
  }, [files, user, storage, cloudSyncEnabled]);

  // Validate Firestore connection on boot and attach auth listener
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser((prev) => ({
          ...prev,
          name: firebaseUser.displayName || prev.name,
          email: firebaseUser.email || prev.email,
        }));
        firestoreService.syncInitialFiles(firebaseUser.uid, files).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  // Multi-file batch upload (Handles uploading multiple files simultaneously)
  const handleUploadMultipleFiles = (uploadedFiles: File[]) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newCloudFiles: CloudFile[] = [];
    let addedImagesGB = 0;
    let addedImagesCount = 0;
    let addedVideosGB = 0;
    let addedVideosCount = 0;
    let addedAudiosMB = 0;
    let addedAudiosCount = 0;
    let addedDocsMB = 0;
    let addedDocsCount = 0;
    let totalAddedBytes = 0;

    uploadedFiles.forEach((file, index) => {
      let type: FileType = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const sizeMB = file.size / (1024 * 1024);
      const sizeGB = file.size / (1024 * 1024 * 1024);
      const sizeFormatted = sizeMB > 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

      let url: string | undefined = undefined;
      if (type === 'image') {
        try {
          url = URL.createObjectURL(file);
        } catch {}
      }

      const item: CloudFile = {
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        type,
        sizeBytes: file.size,
        formattedSize: sizeFormatted,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isFavorite: false,
        url,
      };

      newCloudFiles.push(item);
      totalAddedBytes += file.size;

      if (type === 'image') {
        addedImagesGB += Math.max(0.01, sizeGB);
        addedImagesCount += 1;
      } else if (type === 'video') {
        addedVideosGB += Math.max(0.01, sizeGB);
        addedVideosCount += 1;
      } else if (type === 'audio') {
        addedAudiosMB += Math.max(0.1, sizeMB);
        addedAudiosCount += 1;
      } else {
        addedDocsMB += Math.max(0.1, sizeMB);
        addedDocsCount += 1;
      }
    });

    const totalAddedGB = +(totalAddedBytes / (1024 * 1024 * 1024)).toFixed(2);

    setFiles((prev) => [...newCloudFiles, ...prev]);

    setStorage((prev) => {
      const newUsedGB = +(prev.usedGB + Math.max(0.01, totalAddedGB)).toFixed(2);
      return {
        ...prev,
        usedGB: newUsedGB,
        imagesGB: +(prev.imagesGB + addedImagesGB).toFixed(2),
        imagesCount: prev.imagesCount + addedImagesCount,
        videosGB: +(prev.videosGB + addedVideosGB).toFixed(2),
        videosCount: prev.videosCount + addedVideosCount,
        audiosMB: +(prev.audiosMB + addedAudiosMB).toFixed(2),
        audiosCount: prev.audiosCount + addedAudiosCount,
        docsMB: +(prev.docsMB + addedDocsMB).toFixed(2),
        docsCount: prev.docsCount + addedDocsCount,
      };
    });

    setSyncToast(`Uploaded ${uploadedFiles.length} file(s) to ${siteSettings.websiteName}`);
    setTimeout(() => setSyncToast(null), 3000);

    if (auth.currentUser) {
      firestoreService.syncInitialFiles(auth.currentUser.uid, [...newCloudFiles, ...files]).catch(() => {});
    }
  };

  // Rename File or Folder
  const handleRenameFile = (fileId: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newName } : f))
    );
    if (previewFile && previewFile.id === fileId) {
      setPreviewFile((prev) => (prev ? { ...prev, name: newName } : null));
    }
    setSyncToast(`Renamed to "${newName}"`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Move File or Folder
  const handleMoveFile = (fileId: string, destinationFolderId: string | null) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, parentFolderId: destinationFolderId } : f))
    );
    if (previewFile && previewFile.id === fileId) {
      setPreviewFile((prev) => (prev ? { ...prev, parentFolderId: destinationFolderId } : null));
    }
    setSyncToast(`Moved to destination`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Copy Single File
  const handleCopyFile = (fileToCopy: CloudFile, targetFolderId?: string | null) => {
    const dotIndex = fileToCopy.name.lastIndexOf('.');
    let copyName = '';
    if (dotIndex > 0) {
      copyName = `${fileToCopy.name.slice(0, dotIndex)} (Copy)${fileToCopy.name.slice(dotIndex)}`;
    } else {
      copyName = `${fileToCopy.name} (Copy)`;
    }

    const copiedItem: CloudFile = {
      ...fileToCopy,
      id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: copyName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      parentFolderId: targetFolderId !== undefined ? targetFolderId : fileToCopy.parentFolderId,
    };

    setFiles((prev) => [copiedItem, ...prev]);

    // Update storage stats
    const sizeInGB = +(fileToCopy.sizeBytes / (1024 * 1024 * 1024)).toFixed(3);
    const sizeInMB = +(fileToCopy.sizeBytes / (1024 * 1024)).toFixed(2);
    setStorage((prev) => {
      const newUsed = +(prev.usedGB + Math.max(0.01, sizeInGB)).toFixed(2);
      if (fileToCopy.type === 'image') {
        return {
          ...prev,
          usedGB: newUsed,
          imagesGB: +(prev.imagesGB + Math.max(0.01, sizeInGB)).toFixed(2),
          imagesCount: prev.imagesCount + 1,
        };
      } else if (fileToCopy.type === 'video') {
        return {
          ...prev,
          usedGB: newUsed,
          videosGB: +(prev.videosGB + Math.max(0.01, sizeInGB)).toFixed(2),
          videosCount: prev.videosCount + 1,
        };
      } else if (fileToCopy.type === 'audio') {
        return {
          ...prev,
          usedGB: newUsed,
          audiosMB: +(prev.audiosMB + Math.max(0.1, sizeInMB)).toFixed(2),
          audiosCount: prev.audiosCount + 1,
        };
      } else {
        return {
          ...prev,
          usedGB: newUsed,
          docsMB: +(prev.docsMB + Math.max(0.1, sizeInMB)).toFixed(2),
          docsCount: prev.docsCount + 1,
        };
      }
    });

    setSyncToast(`Copied "${copyName}"`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Bulk Copy Files
  const handleBulkCopy = (ids: string[], targetFolderId?: string | null) => {
    const idSet = new Set(ids);
    const targetFiles = files.filter((f) => idSet.has(f.id));
    targetFiles.forEach((f) => handleCopyFile(f, targetFolderId));
    setSyncToast(`Copied ${targetFiles.length} file(s)`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Toggle favorite
  const handleToggleFavorite = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f))
    );
  };

  // Bulk Favorite
  const handleBulkFavorite = (ids: string[], makeFavorite: boolean) => {
    const idSet = new Set(ids);
    setFiles((prev) =>
      prev.map((f) => (idSet.has(f.id) ? { ...f, isFavorite: makeFavorite } : f))
    );
  };

  // Move single file to Recycle Bin
  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find((f) => f.id === fileId);
    if (!fileToDelete) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setRecycleBin((prev) => [fileToDelete, ...prev]);

    const sizeInGB = fileToDelete.sizeBytes / (1024 * 1024 * 1024);
    setStorage((prev) => ({
      ...prev,
      usedGB: Math.max(0, +(prev.usedGB - sizeInGB).toFixed(2)),
    }));
    setSyncToast(`Moved to Recycle Bin`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Bulk Delete to Recycle Bin
  const handleBulkDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    const filesToDelete = files.filter((f) => idSet.has(f.id));
    if (filesToDelete.length === 0) return;

    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
    setRecycleBin((prev) => [...filesToDelete, ...prev]);

    const deletedBytes = filesToDelete.reduce((sum, f) => sum + f.sizeBytes, 0);
    const deletedGB = deletedBytes / (1024 * 1024 * 1024);

    setStorage((prev) => ({
      ...prev,
      usedGB: Math.max(0, +(prev.usedGB - deletedGB).toFixed(2)),
    }));
    setSyncToast(`Moved ${filesToDelete.length} item(s) to Recycle Bin`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Delete Permanently Forever (বিনা দ্বিধায় সারা জীবনের জন্য মুছে ফেলা)
  const handlePermanentDelete = (fileId: string) => {
    const fileToDelete = files.find((f) => f.id === fileId);
    if (!fileToDelete) return;

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (previewFile && previewFile.id === fileId) {
      setPreviewFile(null);
    }

    const sizeInGB = fileToDelete.sizeBytes / (1024 * 1024 * 1024);
    setStorage((prev) => ({
      ...prev,
      usedGB: Math.max(0, +(prev.usedGB - sizeInGB).toFixed(2)),
    }));
    setSyncToast(`Permanently deleted from storage forever`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Bulk Delete Permanently Forever
  const handleBulkPermanentDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    const filesToDelete = files.filter((f) => idSet.has(f.id));
    if (filesToDelete.length === 0) return;

    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));

    const deletedBytes = filesToDelete.reduce((sum, f) => sum + f.sizeBytes, 0);
    const deletedGB = deletedBytes / (1024 * 1024 * 1024);

    setStorage((prev) => ({
      ...prev,
      usedGB: Math.max(0, +(prev.usedGB - deletedGB).toFixed(2)),
    }));
    setSyncToast(`Permanently deleted ${filesToDelete.length} item(s) forever`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Permanent Delete an item from Recycle Bin
  const handlePermanentDeleteFromBin = (fileId: string) => {
    setRecycleBin((prev) => prev.filter((f) => f.id !== fileId));
    setSyncToast(`Permanently erased from Recycle Bin forever`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Bulk Move
  const handleBulkMove = (ids: string[], destinationFolderId: string | null) => {
    const idSet = new Set(ids);
    setFiles((prev) =>
      prev.map((f) => (idSet.has(f.id) ? { ...f, parentFolderId: destinationFolderId } : f))
    );
    setSyncToast(`Moved ${ids.length} item(s)`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Restore from Recycle Bin
  const handleRestoreFile = (fileToRestore: CloudFile) => {
    setRecycleBin((prev) => prev.filter((f) => f.id !== fileToRestore.id));
    setFiles((prev) => [fileToRestore, ...prev]);
    const sizeInGB = fileToRestore.sizeBytes / (1024 * 1024 * 1024);
    setStorage((prev) => ({
      ...prev,
      usedGB: +(prev.usedGB + sizeInGB).toFixed(2),
    }));
    setSyncToast(`Restored ${fileToRestore.name}`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Empty Recycle Bin Permanently
  const handleEmptyBin = () => {
    setRecycleBin([]);
    setIsRecycleBinOpen(false);
    setSyncToast(`Recycle Bin emptied forever`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Create New Folder
  const handleCreateFolder = (name: string) => {
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}`,
      name,
      type: 'folder',
      sizeBytes: 0,
      formattedSize: 'Folder',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isFavorite: false,
      itemCount: 0,
    };
    setFiles((prev) => [newFolder, ...prev]);
    setSyncToast(`Folder "${name}" created`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Single upload action from FAB
  const handleFabAction = (action: 'image' | 'video' | 'audio' | 'document' | 'folder') => {
    setIsFabOpen(false);
    if (action === 'folder') {
      setIsNewFolderOpen(true);
    }
  };

  // Navigate to Category from Home
  const handleSelectCategory = (type: FileType) => {
    setInitialFilesFilter(type);
    setCurrentTab('files');
  };

  // Save Profile Changes (Updates user & registeredUsers list)
  const handleSaveProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updated };
      setRegisteredUsers((prevUsers) =>
        prevUsers.map((u) =>
          (prev.email && u.email === prev.email) || (prev.phone && u.phone === prev.phone)
            ? {
                ...u,
                name: nextUser.name || u.name,
                phone: nextUser.phone || u.phone,
                email: nextUser.email || u.email,
                avatarUrl: nextUser.avatarUrl || u.avatarUrl,
              }
            : u
        )
      );
      return nextUser;
    });
    setSyncToast(`Profile updated successfully`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Delete Account
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
      filesCount: files.length,
      storageUsedMB: Math.round(storage.usedGB * 1024),
    };

    if (existingIndex >= 0) {
      setRegisteredUsers((prev) => prev.map((u, i) => (i === existingIndex ? userRecord : u)));
    } else {
      setRegisteredUsers((prev) => [userRecord, ...prev]);
    }

    setScreen('main');
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
          onBack={() => setScreen('main')}
        />
      ) : screen === 'search' ? (
        /* 3. Search Screen */
        <SearchScreen
          files={files}
          onBack={() => setScreen('main')}
          onSelectFile={(f) => {
            if (f.type === 'audio') setSelectedAudioFile(f);
            else setPreviewFile(f);
          }}
        />
      ) : screen === 'notifications' ? (
        /* 4. Notifications Screen */
        <NotificationsScreen onBack={() => setScreen('main')} />
      ) : screen === 'storage-analysis' ? (
        /* 5. Storage Analysis Screen (Recharts Doughnut) */
        <StorageAnalysisScreen
          storage={storage}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'edit-profile' ? (
        /* 6. Edit Profile Screen with Bottom Sheets */
        <EditProfileScreen
          user={user}
          onBack={() => setScreen('main')}
          onSaveProfile={handleSaveProfile}
        />
      ) : screen === 'app-settings' ? (
        /* 7. App Settings Screen */
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
        />
      ) : (
        /* 8. Main Tabs (Home, Files, Favourites, Me) */
        <div className="flex-1 flex flex-col justify-between relative overflow-y-auto">
          {currentTab === 'home' && (
            <HomeScreen
              storage={storage}
              websiteName={siteSettings.websiteName}
              logoUrl={siteSettings.logoUrl}
              onOpenSearch={() => setScreen('search')}
              onOpenNotifications={() => setScreen('notifications')}
              onSelectCategory={handleSelectCategory}
              onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
              onOpenUpload={() => setIsFabOpen(true)}
              onOpenAnalysis={() => setScreen('storage-analysis')}
              onUploadMultipleFiles={handleUploadMultipleFiles}
            />
          )}

          {currentTab === 'files' && (
            <FilesScreen
              files={files}
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
              onPlayAudio={(f) => setSelectedAudioFile(f)}
              onOpenFilePreview={(f) => setPreviewFile(f)}
              onUploadMultipleFiles={handleUploadMultipleFiles}
              initialFilter={initialFilesFilter}
            />
          )}

          {currentTab === 'favourites' && (
            <FavouritesScreen
              files={files}
              onOpenSearch={() => setScreen('search')}
              onToggleFavorite={handleToggleFavorite}
              onPlayAudio={(f) => setSelectedAudioFile(f)}
            />
          )}

          {currentTab === 'me' && (
            <ProfileScreen
              user={user}
              storage={storage}
              websiteName={siteSettings.websiteName}
              onOpenEditProfile={() => setScreen('edit-profile')}
              onOpenAppSettings={() => setScreen('app-settings')}
              onOpenAdminPanel={() => setScreen('admin-panel')}
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
              onToggle={() => setIsFabOpen(!isFabOpen)}
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
        availableFolders={files.filter((f) => f.type === 'folder')}
      />

      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        deletedFiles={recycleBin}
        onRestore={handleRestoreFile}
        onEmptyBin={handleEmptyBin}
        onDeletePermanently={handlePermanentDeleteFromBin}
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

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="absolute top-5 left-4 right-4 z-50 bg-[#122847] border border-blue-400/50 text-sky-200 text-xs px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-medium text-[11px] leading-tight">{syncToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            ✕
          </button>
        </div>
      )}
    </PhoneContainer>
  );
}
