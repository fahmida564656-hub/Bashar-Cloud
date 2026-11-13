import test from 'node:test';
import assert from 'node:assert/strict';
import { removeUserFromList, isStateClean } from './accountManagement';
import { RegisteredUser, CloudFile, StorageUsage } from '../types';
import { initialFiles, initialRecycleBin, initialStorageUsage, defaultSiteSettings } from '../data/initialData';

test('removeUserFromList correctly removes target user while keeping others', () => {
  const users: RegisteredUser[] = [
    {
      id: 'user-1',
      name: 'Bashar Ahmed',
      email: 'bashar@test.com',
      phone: '01734211584',
      filesCount: 5,
      storageUsedMB: 10,
      registeredAt: 'Mar 10, 2026',
      registeredTimestamp: 1773180000000,
    },
    {
      id: 'user-2',
      name: 'Rahim Khan',
      email: 'rahim@test.com',
      phone: '01811223344',
      filesCount: 2,
      storageUsedMB: 4,
      registeredAt: 'Mar 9, 2026',
      registeredTimestamp: 1773093600000,
    },
  ];

  const remaining = removeUserFromList(users, 'user-1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'user-2');
});

test('removeUserFromList handles empty list or non-existent ID safely', () => {
  const users: RegisteredUser[] = [
    {
      id: 'user-1',
      name: 'Bashar Ahmed',
      email: 'bashar@test.com',
      phone: '01734211584',
      filesCount: 1,
      storageUsedMB: 2,
      registeredAt: 'Mar 10, 2026',
      registeredTimestamp: 1773180000000,
    },
  ];

  const same = removeUserFromList(users, 'non-existent');
  assert.equal(same.length, 1);

  const empty = removeUserFromList([], 'user-1');
  assert.equal(empty.length, 0);
});

test('initial state contains strictly zero sample files and enforces admin password Fahmida3421', () => {
  const sampleFile: CloudFile = {
    id: 'user-file-1',
    name: 'real-upload.txt',
    type: 'document',
    sizeBytes: 1024,
    formattedSize: '1 KB',
    date: 'Mar 10, 2026',
    isFavorite: false,
  };
  const nonEmptyStorage: StorageUsage = {
    ...initialStorageUsage,
    usedGB: 1,
    docsCount: 1,
  };

  assert.equal(initialFiles.length, 0);
  assert.equal(initialRecycleBin.length, 0);
  assert.equal(defaultSiteSettings.adminPassword, 'Fahmida3421');
  assert.equal(isStateClean(initialFiles, initialStorageUsage), true);
  assert.equal(isStateClean([sampleFile], nonEmptyStorage), false);
});
