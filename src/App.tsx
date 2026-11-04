/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
} from './data/initialData';
import { storageProviderMock } from './services/storageProviderMock';
import { testFirestoreConnection, auth } from './firebase/config';
import { firestoreService } from './firebase/firestoreService';
import { onAuthStateChanged } from 'firebase/auth';
import { MainTab, ScreenMode, CloudFile, UserProfile, StorageUsage, FileType } from './types';

export default function App() {
  // Screen and Tab state - starts on Welcome / Sign In / Sign Up
  const savedState = storageProviderMock.loadMetadataState();
  const hasExistingUser = !!(savedState.user && (savedState.user.name || savedState.user.email));

  const [screen, setScreen] = useState<ScreenMode>(hasExistingUser ? 'main' : 'welcome-email');
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [initialFilesFilter, setInitialFilesFilter] = useState<string>('all');

  // User and Storage state - no demo account by default
  const [user, setUser] = useState<UserProfile>(
    hasExistingUser ? savedState.user! : initialUserProfile
  );
  const [storage, setStorage] = useState<StorageUsage>(savedState.storage || initialStorageUsage);
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

  // Trigger synchronization with storage provider mock
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
  React.useEffect(() => {
    if (!cloudSyncEnabled) return;

    // Periodic interval (every 20 seconds)
    const interval = setInterval(() => {
      performSync(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [cloudSyncEnabled, files, user, storage]);

  // Persist state on state updates when cloud sync is enabled
  React.useEffect(() => {
    if (cloudSyncEnabled) {
      storageProviderMock.saveMetadataState(files, user, storage);
    }
  }, [files, user, storage, cloudSyncEnabled]);

  // Validate Firestore connection on boot and attach auth listener
  React.useEffect(() => {
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
        // Sync initial files to Firestore if needed
        firestoreService.syncInitialFiles(firebaseUser.uid, files).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  // Toggle favorite
  const handleToggleFavorite = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f))
    );
  };

  // Move to Recycle Bin
  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find((f) => f.id === fileId);
    if (!fileToDelete) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setRecycleBin((prev) => [fileToDelete, ...prev]);

    // Update storage stats
    const sizeInGB = fileToDelete.sizeBytes / (1024 * 1024 * 1024);
    setStorage((prev) => ({
      ...prev,
      usedGB: Math.max(0, +(prev.usedGB - sizeInGB).toFixed(2)),
    }));
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
  };

  // Empty Recycle Bin
  const handleEmptyBin = () => {
    setRecycleBin([]);
    setIsRecycleBinOpen(false);
  };

  // Create New Folder
  const handleCreateFolder = (name: string) => {
    const newFolder: CloudFile = {
      id: `folder-${Date.now()}`,
      name,
      type: 'folder',
      sizeBytes: 0,
      formattedSize: 'Folder',
      date: 'Nov 04, 2026',
      isFavorite: false,
      itemCount: 0,
    };
    setFiles((prev) => [newFolder, ...prev]);
  };

  // Upload native or synthetic file
  const handleUploadFile = (file: File) => {
    let type: FileType = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const sizeMB = file.size / (1024 * 1024);
    const sizeFormatted = sizeMB > 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    const newCloudFile: CloudFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      type,
      sizeBytes: file.size,
      formattedSize: sizeFormatted,
      date: 'Nov 04, 2026',
      isFavorite: false,
    };

    setFiles((prev) => [newCloudFile, ...prev]);
    setIsFabOpen(false);

    // Update storage with minimum precision for small files
    const sizeGB = +(file.size / (1024 * 1024 * 1024)).toFixed(3);
    const addedGB = Math.max(0.01, sizeGB);

    setStorage((prev) => {
      const updatedUsed = +(prev.usedGB + addedGB).toFixed(2);
      if (type === 'image') {
        return {
          ...prev,
          usedGB: updatedUsed,
          imagesGB: +(prev.imagesGB + addedGB).toFixed(2),
          imagesCount: prev.imagesCount + 1,
        };
      } else if (type === 'video') {
        return {
          ...prev,
          usedGB: updatedUsed,
          videosGB: +(prev.videosGB + addedGB).toFixed(2),
          videosCount: prev.videosCount + 1,
        };
      } else if (type === 'audio') {
        return {
          ...prev,
          usedGB: updatedUsed,
          audiosMB: +(prev.audiosMB + Math.max(0.1, sizeMB)).toFixed(2),
          audiosCount: prev.audiosCount + 1,
        };
      }
      return {
        ...prev,
        usedGB: updatedUsed,
        docsMB: +(prev.docsMB + Math.max(0.1, sizeMB)).toFixed(2),
        docsCount: prev.docsCount + 1,
      };
    });
  };

  // Select FAB action
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

  // Save Profile Changes
  const handleSaveProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updated }));
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

  return (
    <PhoneContainer>
      {/* Quick Screen Jump Pill for direct navigation */}
      <div className="bg-[#101927] border-b border-[#1b2b42] px-3 py-1 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span className="font-medium text-slate-300">Screen View:</span>
        <select
          value={screen === 'main' ? `tab-${currentTab}` : screen}
          onChange={(e) => {
            const val = e.target.value;
            if (val.startsWith('tab-')) {
              setScreen('main');
              setCurrentTab(val.replace('tab-', '') as MainTab);
            } else {
              setScreen(val as ScreenMode);
            }
          }}
          className="bg-[#17253b] border border-[#233857] text-slate-200 rounded px-2 py-0.5 text-[11px] focus:outline-none cursor-pointer"
        >
          <option value="welcome-email">Sign In / Sign Up</option>
          <option value="tab-home">Home</option>
          <option value="tab-files">All Files</option>
          <option value="tab-favourites">Favourites</option>
          <option value="tab-me">Me / Profile</option>
          <option value="edit-profile">Edit Profile</option>
          <option value="app-settings">App Settings</option>
          <option value="search">Search</option>
          <option value="notifications">Notifications</option>
          <option value="storage-analysis">Storage Analysis (Recharts)</option>
        </select>
      </div>

      {/* 1. Welcome / Auth Flow (Sign In & Sign Up) */}
      {screen === 'welcome-email' || screen === 'welcome-phone' ? (
        <WelcomeScreen
          onSuccess={(authenticatedUser) => {
            setUser(authenticatedUser);
            setScreen('main');
          }}
        />
      ) : screen === 'search' ? (
        /* 2. Search Screen */
        <SearchScreen
          files={files}
          onBack={() => setScreen('main')}
          onSelectFile={(f) => {
            if (f.type === 'audio') setSelectedAudioFile(f);
          }}
        />
      ) : screen === 'notifications' ? (
        /* 3. Notifications Screen */
        <NotificationsScreen onBack={() => setScreen('main')} />
      ) : screen === 'storage-analysis' ? (
        /* 4. Storage Analysis Screen (Recharts Doughnut) */
        <StorageAnalysisScreen
          storage={storage}
          onBack={() => setScreen('main')}
        />
      ) : screen === 'edit-profile' ? (
        /* 5. Edit Profile Screen with Bottom Sheets */
        <EditProfileScreen
          user={user}
          onBack={() => setScreen('main')}
          onSaveProfile={handleSaveProfile}
        />
      ) : screen === 'app-settings' ? (
        /* 6. App Settings Screen */
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
        /* 7. Main Tabs (Home, Files, Favourites, Me) */
        <div className="flex-1 flex flex-col justify-between relative overflow-y-auto">
          {currentTab === 'home' && (
            <HomeScreen
              storage={storage}
              onOpenSearch={() => setScreen('search')}
              onOpenNotifications={() => setScreen('notifications')}
              onSelectCategory={handleSelectCategory}
              onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
              onOpenUpload={() => setIsFabOpen(true)}
              onOpenAnalysis={() => setScreen('storage-analysis')}
            />
          )}

          {currentTab === 'files' && (
            <FilesScreen
              files={files}
              onOpenSearch={() => setScreen('search')}
              onToggleFavorite={handleToggleFavorite}
              onDeleteFile={handleDeleteFile}
              onPlayAudio={(f) => setSelectedAudioFile(f)}
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
              onOpenEditProfile={() => setScreen('edit-profile')}
              onOpenAppSettings={() => setScreen('app-settings')}
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
              onUploadNativeFile={handleUploadFile}
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
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        deletedFiles={recycleBin}
        onRestore={handleRestoreFile}
        onEmptyBin={handleEmptyBin}
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
        <div className="absolute top-12 left-4 right-4 z-50 bg-[#122847] border border-blue-400/50 text-sky-200 text-xs px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
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
