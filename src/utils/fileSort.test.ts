import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudFile } from '../types';
import { sortFiles, parseDateToTime } from './fileSort';

const mockFiles: CloudFile[] = [
  {
    id: 'f1',
    name: 'zebra.png',
    type: 'image',
    sizeBytes: 5000,
    formattedSize: '5 KB',
    date: 'Nov 1, 2026',
    isFavorite: false,
  },
  {
    id: 'f2',
    name: 'apple.pdf',
    type: 'document',
    sizeBytes: 20000,
    formattedSize: '20 KB',
    date: 'Nov 5, 2026',
    isFavorite: false,
  },
  {
    id: 'f3',
    name: 'Documents Folder',
    type: 'folder',
    sizeBytes: 0,
    formattedSize: '0 B',
    date: 'Nov 3, 2026',
    isFavorite: false,
  },
  {
    id: 'f4',
    name: 'mango.mp3',
    type: 'audio',
    sizeBytes: 1000,
    formattedSize: '1 KB',
    date: 'Oct 20, 2026',
    isFavorite: false,
  },
];

test('parseDateToTime correctly converts dates to epoch ms', () => {
  assert.ok(parseDateToTime('Nov 1, 2026') > 0);
  assert.equal(parseDateToTime(''), 0);
  assert.equal(parseDateToTime('invalid-date'), 0);
});

test('sortFiles by name ascending keeps folders first then alphabetical', () => {
  const result = sortFiles(mockFiles, 'name', 'asc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'apple.pdf');
  assert.equal(result[2].name, 'mango.mp3');
  assert.equal(result[3].name, 'zebra.png');
});

test('sortFiles by name descending', () => {
  const result = sortFiles(mockFiles, 'name', 'desc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'zebra.png');
  assert.equal(result[2].name, 'mango.mp3');
  assert.equal(result[3].name, 'apple.pdf');
});

test('sortFiles by size descending', () => {
  const result = sortFiles(mockFiles, 'size', 'desc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'apple.pdf'); // 20000 bytes
  assert.equal(result[2].name, 'zebra.png'); // 5000 bytes
  assert.equal(result[3].name, 'mango.mp3'); // 1000 bytes
});

test('sortFiles by size ascending', () => {
  const result = sortFiles(mockFiles, 'size', 'asc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'mango.mp3'); // 1000 bytes
  assert.equal(result[2].name, 'zebra.png'); // 5000 bytes
  assert.equal(result[3].name, 'apple.pdf'); // 20000 bytes
});

test('sortFiles by date descending (newest first)', () => {
  const result = sortFiles(mockFiles, 'date', 'desc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'apple.pdf'); // Nov 5
  assert.equal(result[2].name, 'zebra.png'); // Nov 1
  assert.equal(result[3].name, 'mango.mp3'); // Oct 20
});

test('sortFiles by date ascending (oldest first)', () => {
  const result = sortFiles(mockFiles, 'date', 'asc', true);
  assert.equal(result[0].name, 'Documents Folder'); // folder first
  assert.equal(result[1].name, 'mango.mp3'); // Oct 20
  assert.equal(result[2].name, 'zebra.png'); // Nov 1
  assert.equal(result[3].name, 'apple.pdf'); // Nov 5
});
