import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPersistableUrl,
  isTextDocumentName,
  sanitizeFileForPersistence,
  sanitizeFirestoreMediaUrl,
  fitFilePayloadToFirestoreLimit,
  estimateUtf8ByteSize,
  mergeCloudAndLocalFiles,
  computeStorageBreakdown,
  formatTotalBytesUsed,
} from './fileVault';
import { CloudFile } from '../types';

test('isPersistableUrl rejects ephemeral blob URLs and accepts data/https/asset URLs', () => {
  assert.equal(isPersistableUrl('blob:http://localhost:3000/abc-123'), false);
  assert.equal(isPersistableUrl(''), false);
  assert.equal(isPersistableUrl(undefined), false);
  assert.equal(isPersistableUrl('data:text/plain;base64,SGVsbG8='), true);
  assert.equal(isPersistableUrl('/assets/aistudio/logo.png'), true);
  assert.equal(isPersistableUrl('https://example.com/file.pdf'), true);
});

test('isTextDocumentName identifies editable/readable text formats cleanly', () => {
  assert.equal(isTextDocumentName('notes.txt'), true);
  assert.equal(isTextDocumentName('data.json', 'application/json'), true);
  assert.equal(isTextDocumentName('sheet.csv'), true);
  assert.equal(isTextDocumentName('archive.zip'), false);
  assert.equal(isTextDocumentName('photo.png', 'image/png'), false);
});

test('sanitizeFileForPersistence strips blob URLs while keeping persistable data, content, versions, and archive entries', () => {
  const file: CloudFile = {
    id: 'f-1',
    name: 'notes.txt',
    type: 'document',
    sizeBytes: 1200,
    formattedSize: '1 KB',
    date: 'Mar 10, 2026',
    isFavorite: true,
    parentFolderId: 'folder-1',
    url: 'blob:http://localhost:3000/transient-id',
    content: 'Important permanent notes',
    versions: [
      {
        versionId: 'f-1-v1',
        versionNumber: 1,
        timestamp: 'Mar 10, 2026',
        sizeBytes: 1200,
        formattedSize: '1 KB',
        action: 'Created',
        name: 'notes.txt',
      },
    ],
  };

  const sanitized = sanitizeFileForPersistence(file);
  assert.equal(sanitized.url, undefined);
  assert.equal(sanitized.content, 'Important permanent notes');
  assert.equal(sanitized.parentFolderId, 'folder-1');
  assert.equal(sanitized.isFavorite, true);
  assert.equal(sanitized.versions?.length, 1);

  const fileWithDataUrl: CloudFile = {
    ...file,
    url: 'data:text/plain;base64,SGVsbG8=',
    thumbnail: 'data:image/jpeg;base64,AAAA',
  };
  const sanitizedWithData = sanitizeFileForPersistence(fileWithDataUrl);
  assert.equal(sanitizedWithData.url, 'data:text/plain;base64,SGVsbG8=');
  assert.equal(sanitizedWithData.thumbnail, 'data:image/jpeg;base64,AAAA');
});

test('mergeCloudAndLocalFiles preserves hydrated local URLs and contents when cloud snapshot omits them', () => {
  const cloud: CloudFile[] = [
    {
      id: 'f-1',
      name: 'video.mp4',
      type: 'video',
      sizeBytes: 5_000_000,
      formattedSize: '4.8 MB',
      date: 'Mar 10, 2026',
      isFavorite: true,
    },
  ];
  const local: CloudFile[] = [
    {
      id: 'f-1',
      name: 'video.mp4',
      type: 'video',
      sizeBytes: 5_000_000,
      formattedSize: '4.8 MB',
      date: 'Mar 10, 2026',
      isFavorite: false,
      url: 'blob:http://localhost:3000/hydrated-from-idb',
    },
  ];

  const merged = mergeCloudAndLocalFiles(cloud, local);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].isFavorite, true);
  assert.equal(merged[0].url, 'blob:http://localhost:3000/hydrated-from-idb');
});

test('computeStorageBreakdown and formatTotalBytesUsed count all files including archives accurately', () => {
  const files: CloudFile[] = [
    {
      id: '1',
      name: 'pic.jpg',
      type: 'image',
      sizeBytes: 500 * 1024,
      formattedSize: '500 KB',
      date: 'Mar 10, 2026',
      isFavorite: false,
    },
    {
      id: '2',
      name: 'backup.zip',
      type: 'archive',
      sizeBytes: 2 * 1024 * 1024,
      formattedSize: '2.0 MB',
      date: 'Mar 10, 2026',
      isFavorite: false,
    },
  ];

  const storage = computeStorageBreakdown(files, 1000);
  assert.equal(storage.imagesCount, 1);
  assert.equal(storage.docsCount, 1);
  assert.equal(storage.docsMB, 2);
  assert.ok(storage.usedGB > 0);
  assert.equal(formatTotalBytesUsed(0), '0 B');
  assert.equal(formatTotalBytesUsed(1024 * 512), '512 KB');
});

test('sanitizeFirestoreMediaUrl drops oversized base64 avatars exceeding safe Firestore threshold', () => {
  const hugeDataUrl = `data:image/jpeg;base64,${'A'.repeat(1_878_600)}`;
  assert.equal(sanitizeFirestoreMediaUrl(hugeDataUrl), '');

  const compactDataUrl = `data:image/jpeg;base64,${'A'.repeat(12_000)}`;
  assert.equal(sanitizeFirestoreMediaUrl(compactDataUrl), compactDataUrl);

  assert.equal(sanitizeFirestoreMediaUrl('blob:http://localhost:3000/123'), '');
  assert.equal(sanitizeFirestoreMediaUrl('/assets/aistudio/logo.png'), '/assets/aistudio/logo.png');
});

test('fitFilePayloadToFirestoreLimit trims bulky inline fields so payload stays below 880 KB', () => {
  const hugePayload = {
    id: 'file-big',
    name: 'huge.txt',
    type: 'document',
    sizeBytes: 2_000_000,
    url: `data:text/plain;base64,${'B'.repeat(450_000)}`,
    thumbnail: `data:image/jpeg;base64,${'C'.repeat(135_000)}`,
    content: 'D'.repeat(400_000),
    ownerId: 'user-1',
  };

  const fitted = fitFilePayloadToFirestoreLimit(hugePayload);
  assert.ok(estimateUtf8ByteSize(fitted) <= 880_000);
  assert.equal(fitted.name, 'huge.txt');
  assert.equal(fitted.ownerId, 'user-1');
});
