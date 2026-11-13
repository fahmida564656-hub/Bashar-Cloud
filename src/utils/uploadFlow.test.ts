import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  calculateTotalSize,
  formatSelectedCount,
  resolveFileType,
  createQueueItem,
  estimateRemainingTime,
} from './uploadFlow';

test('formatBytes formats bytes accurately', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1024 * 1024 * 65), '65.0 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024 * 2.2), '2.2 GB');
});

test('calculateTotalSize sums sizes correctly', () => {
  const items = [
    { sizeBytes: 1024 * 1024 * 50 },
    { sizeBytes: 1024 * 1024 * 15 },
  ];
  assert.equal(calculateTotalSize(items), '65.0 MB');
});

test('formatSelectedCount formats singular and plural counts', () => {
  assert.equal(formatSelectedCount(1), '1 file selected');
  assert.equal(formatSelectedCount(49), '49 files selected');
  assert.equal(formatSelectedCount(0), '0 files selected');
});

test('resolveFileType categorizes file types by extension and mime', () => {
  assert.equal(resolveFileType('video.mp4'), 'video');
  assert.equal(resolveFileType('photo.png'), 'image');
  assert.equal(resolveFileType('song.mp3'), 'audio');
  assert.equal(resolveFileType('backup.zip'), 'archive');
  assert.equal(resolveFileType('report.docx'), 'document');
});

test('createQueueItem produces valid initial item in preparing state', () => {
  const item = createQueueItem({ name: '20231208_151531.mp4', size: 65 * 1024 * 1024, type: 'video/mp4' });
  assert.equal(item.name, '20231208_151531.mp4');
  assert.equal(item.type, 'video');
  assert.equal(item.status, 'preparing');
  assert.equal(item.formattedSize, '65.0 MB');
  assert.equal(item.progress, 0);
});

test('estimateRemainingTime calculates remaining time gracefully', () => {
  assert.equal(estimateRemainingTime(0, 10, 0), 'Calculating...');
  assert.equal(estimateRemainingTime(2, 4, 10), '10s');
  assert.equal(estimateRemainingTime(4, 4, 10), '0s');
});
