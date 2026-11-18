import test from 'node:test';
import assert from 'node:assert/strict';
import {
  removeUserFromList,
  isStateClean,
  normalizeAccountPhone,
  doesPaymentBelongToUser,
  filterOutUserPayments,
  buildDeterministicAccountId,
  findMatchingUserRecords,
  mergeRegisteredUserRecords,
  collectCandidateOwnerIds,
} from './accountManagement';
import { RegisteredUser, CloudFile, StorageUsage, PaymentRequest } from '../types';
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

test('filterOutUserPayments deletes all payment records matching deleted user ID, email, or phone while preserving others', () => {
  assert.equal(normalizeAccountPhone('+8801711-223344'), '1711223344');
  assert.equal(normalizeAccountPhone('123'), '');

  const payments: PaymentRequest[] = [
    {
      id: 'pay-by-email',
      userId: 'Target@Test.com',
      userName: 'Target User',
      userEmail: 'target@test.com',
      userPhone: '',
      method: 'bkash',
      senderPhone: '01711223344',
      transactionId: 'TRX111111',
      amount: 100,
      submittedAt: 'Mar 12, 2026',
      submittedTimestamp: 1773200000000,
      status: 'pending',
    },
    {
      id: 'pay-by-phone-sender',
      userId: 'guest-user',
      userName: 'Target User',
      userEmail: '',
      userPhone: '+8801711223344',
      method: 'nagad',
      senderPhone: '01711223344',
      transactionId: 'TRX222222',
      amount: 100,
      submittedAt: 'Mar 12, 2026',
      submittedTimestamp: 1773200050000,
      status: 'approved',
    },
    {
      id: 'pay-by-uid',
      userId: 'user-target-99',
      userName: 'Target User',
      userEmail: '',
      userPhone: '',
      method: 'bkash',
      senderPhone: '01900000000',
      transactionId: 'TRX333333',
      amount: 100,
      submittedAt: 'Mar 12, 2026',
      submittedTimestamp: 1773200090000,
      status: 'pending',
    },
    {
      id: 'pay-other-user',
      userId: 'other@test.com',
      userName: 'Other User',
      userEmail: 'other@test.com',
      userPhone: '01855667788',
      method: 'bkash',
      senderPhone: '01855667788',
      transactionId: 'TRX999999',
      amount: 100,
      submittedAt: 'Mar 12, 2026',
      submittedTimestamp: 1773200100000,
      status: 'approved',
    },
  ];

  assert.equal(
    doesPaymentBelongToUser(payments[0], {
      id: 'user-target-99',
      email: 'target@test.com',
      phone: '01711223344',
    }),
    true
  );

  assert.equal(
    doesPaymentBelongToUser(payments[3], {
      id: 'user-target-99',
      email: 'target@test.com',
      phone: '01711223344',
    }),
    false
  );

  const remaining = filterOutUserPayments(payments, {
    id: 'user-target-99',
    email: 'target@test.com',
    phone: '01711223344',
  });
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'pay-other-user');
});

test('buildDeterministicAccountId generates consistent cross-site IDs from email or phone', () => {
  assert.equal(
    buildDeterministicAccountId('  Fahmida564656@Gmail.com ', '01711223344'),
    'acct_fahmida564656_gmail_com'
  );
  assert.equal(buildDeterministicAccountId('', '+8801711223344'), 'phone_1711223344');
});

test('findMatchingUserRecords, mergeRegisteredUserRecords, and collectCandidateOwnerIds unify cross-website accounts', () => {
  const site1User: RegisteredUser = {
    id: 'user-111',
    name: 'Fahmida',
    email: 'fahmida564656@gmail.com',
    phone: '(+880) 1711223344',
    passwordPlain: 'secret123',
    registeredAt: 'Mar 1, 2026',
    registeredTimestamp: 1770000000000,
    filesCount: 4,
    storageUsedMB: 12,
    isLifetimeApproved: true,
    paymentStatus: 'approved',
  };
  const site2User: RegisteredUser = {
    id: 'user-222',
    name: 'Fahmida',
    email: 'fahmida564656@gmail.com',
    phone: '01711223344',
    passwordPlain: 'secret123',
    registeredAt: 'Mar 5, 2026',
    registeredTimestamp: 1770400000000,
    filesCount: 2,
    storageUsedMB: 6,
    isLifetimeApproved: false,
    paymentStatus: 'none',
  };
  const unrelated: RegisteredUser = {
    id: 'user-999',
    name: 'Other',
    email: 'other@example.com',
    phone: '01899999999',
    registeredAt: 'Mar 5, 2026',
    registeredTimestamp: 1770400000000,
    filesCount: 0,
    storageUsedMB: 0,
  };

  const matched = findMatchingUserRecords([site1User, site2User, unrelated], {
    email: 'FAHMIDA564656@GMAIL.COM',
  });
  assert.equal(matched.length, 2);

  const merged = mergeRegisteredUserRecords(site2User, site1User);
  assert.equal(merged.isLifetimeApproved, true);
  assert.equal(merged.paymentStatus, 'approved');
  assert.equal(merged.registeredTimestamp, 1770000000000);
  assert.equal(merged.filesCount, 4);

  const candidateIds = collectCandidateOwnerIds({
    canonicalUserId: 'user-222',
    matchedRecords: matched,
    email: 'fahmida564656@gmail.com',
    phone: '(+880) 1711223344',
  });
  assert.ok(candidateIds.includes('user-222'));
  assert.ok(candidateIds.includes('user-111'));
  assert.ok(candidateIds.includes('acct_fahmida564656_gmail_com'));
  assert.ok(candidateIds.includes('phone_1711223344'));
});


