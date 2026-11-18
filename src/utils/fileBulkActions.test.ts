import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFileAccentTheme,
  summarizeSelectedFiles,
  buildBulkShareText,
  toggleSelectedFileId,
  toggleSelectAllFileIds,
} from './fileBulkActions.ts';
import { CloudFile } from '../types.ts';

const sampleFiles: CloudFile[] = [
  {
    id: 'f-1',
    name: 'Invoice.pdf',
    type: 'document',
    sizeBytes: 2048,
    formattedSize: '2 KB',
    date: '2026-11-13',
    isFavorite: true,
    content: 'Invoice details',
  },
  {
    id: 'f-2',
    name: 'Banner.png',
    type: 'image',
    sizeBytes: 4096,
    formattedSize: '4 KB',
    date: '2026-11-13',
    isFavorite: false,
    url: 'https://cdn.example.com/banner.png',
  },
  {
    id: 'f-3',
    name: 'Backup.zip',
    type: 'archive',
    sizeBytes: 8192,
    formattedSize: '8 KB',
    date: '2026-11-13',
    isFavorite: true,
  },
];

test('getFileAccentTheme returns distinct colored gradient bars and tags per file type', () => {
  const imageTheme = getFileAccentTheme('image');
  const videoTheme = getFileAccentTheme('video');
  const audioTheme = getFileAccentTheme('audio');
  const docTheme = getFileAccentTheme('document');
  const zipTheme = getFileAccentTheme('archive');
  const folderTheme = getFileAccentTheme('folder');

  assert.equal(imageTheme.shortTag, 'IMG');
  assert.equal(videoTheme.shortTag, 'VID');
  assert.equal(audioTheme.shortTag, 'AUD');
  assert.equal(docTheme.shortTag, 'DOC');
  assert.equal(zipTheme.shortTag, 'ZIP');
  assert.equal(folderTheme.shortTag, 'DIR');

  assert.notEqual(imageTheme.topBarGradient, videoTheme.topBarGradient);
  assert.notEqual(docTheme.topBarGradient, zipTheme.topBarGradient);
});

test('summarizeSelectedFiles calculates count, total bytes, allFavorites, and canRename accurately', () => {
  const singleFav = summarizeSelectedFiles(sampleFiles, new Set(['f-1']));
  assert.equal(singleFav.count, 1);
  assert.equal(singleFav.totalBytes, 2048);
  assert.equal(singleFav.allFavorites, true);
  assert.equal(singleFav.canRename, true);

  const mixedMulti = summarizeSelectedFiles(sampleFiles, new Set(['f-1', 'f-2']));
  assert.equal(mixedMulti.count, 2);
  assert.equal(mixedMulti.totalBytes, 6144);
  assert.equal(mixedMulti.allFavorites, false);
  assert.equal(mixedMulti.canRename, false);

  const empty = summarizeSelectedFiles(sampleFiles, new Set());
  assert.equal(empty.count, 0);
  assert.equal(empty.allFavorites, false);
  assert.equal(empty.formattedTotalSize, '0 B');
});

test('buildBulkShareText generates clean formatted summary including external URLs only', () => {
  const text = buildBulkShareText([sampleFiles[0], sampleFiles[1]], 'Bashar Cloud');
  assert.match(text, /Bashar Cloud — Shared 2 items/);
  assert.match(text, /1\. Invoice\.pdf \(2 KB, document\)/);
  assert.match(text, /2\. Banner\.png \(4 KB, image\) — https:\/\/cdn\.example\.com\/banner\.png/);
  assert.equal(buildBulkShareText([]), '');
});

test('toggleSelectedFileId allows selecting and deselecting multiple items cleanly without mutating input', () => {
  const initial = new Set<string>();
  const afterFirst = toggleSelectedFileId(initial, 'f-1');
  assert.deepEqual(Array.from(afterFirst), ['f-1']);
  assert.equal(initial.size, 0);

  const afterSecond = toggleSelectedFileId(afterFirst, 'f-3');
  assert.deepEqual(Array.from(afterSecond), ['f-1', 'f-3']);

  const afterDeselect = toggleSelectedFileId(afterSecond, 'f-1');
  assert.deepEqual(Array.from(afterDeselect), ['f-3']);
});

test('toggleSelectAllFileIds selects all visible items and deselects when all are already selected', () => {
  const selectedAll = toggleSelectAllFileIds(sampleFiles, new Set(['f-1']));
  assert.deepEqual(Array.from(selectedAll), ['f-1', 'f-2', 'f-3']);

  const deselectedAll = toggleSelectAllFileIds(sampleFiles, selectedAll);
  assert.equal(deselectedAll.size, 0);

  const emptyResult = toggleSelectAllFileIds([], new Set(['f-1']));
  assert.equal(emptyResult.size, 0);
});
