import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areCloudChunksComplete,
  buildChunkDocId,
  estimateChunkCount,
  getMissingChunkIndices,
  inferMediaMimeType,
  MAX_CLOUD_CHUNK_FILE_BYTES,
  needsCloudChunkUpload,
  reassembleCloudChunksToBlob,
  reassembleCloudChunksToUint8Array,
  shouldChunkFileToCloud,
  splitBinaryIntoCloudChunks,
} from './cloudChunkSync';

test('shouldChunkFileToCloud triggers cleanly up to 100 MB cap', () => {
  assert.equal(MAX_CLOUD_CHUNK_FILE_BYTES, 100 * 1024 * 1024);
  assert.equal(shouldChunkFileToCloud(100 * 1024), false);
  assert.equal(shouldChunkFileToCloud(340 * 1024), false);
  assert.equal(shouldChunkFileToCloud(340 * 1024 + 1), true);
  assert.equal(shouldChunkFileToCloud(50 * 1024 * 1024), true);
  assert.equal(shouldChunkFileToCloud(100 * 1024 * 1024), true);
  assert.equal(shouldChunkFileToCloud(120 * 1024 * 1024), false);
});

test('needsCloudChunkUpload rejects unverified chunked uploads and skips confirmed or inline files', () => {
  assert.equal(needsCloudChunkUpload({ sizeBytes: 120 * 1024, cloudSynced: false }), false);
  assert.equal(needsCloudChunkUpload({ sizeBytes: 2 * 1024 * 1024, cloudSynced: false }), true);
  assert.equal(needsCloudChunkUpload({ sizeBytes: 2 * 1024 * 1024 }), true);
  assert.equal(needsCloudChunkUpload({ sizeBytes: 2 * 1024 * 1024, cloudSynced: true }), false);
});

test('inferMediaMimeType resolves video, audio, and photo MIME types when browser omits or sends octet-stream', () => {
  assert.equal(inferMediaMimeType('clip.mp4', ''), 'video/mp4');
  assert.equal(inferMediaMimeType('movie.MOV', 'application/octet-stream'), 'video/quicktime');
  assert.equal(inferMediaMimeType('song.mp3', undefined), 'audio/mpeg');
  assert.equal(inferMediaMimeType('voice.m4a', 'binary/octet-stream'), 'audio/mp4');
  assert.equal(inferMediaMimeType('photo.webp', ''), 'image/webp');
  assert.equal(inferMediaMimeType('custom.mp4', 'video/mp4'), 'video/mp4');
});

test('estimateChunkCount and buildChunkDocId produce deterministic ordered chunk keys', () => {
  assert.equal(estimateChunkCount(0), 0);
  assert.equal(estimateChunkCount(900 * 1024, 420 * 1024), 3);
  assert.equal(buildChunkDocId('file-abc', 0), 'file-abc__chunk_0');
  assert.equal(buildChunkDocId('file-abc', 4), 'file-abc__chunk_4');
});

test('getMissingChunkIndices and areCloudChunksComplete catch incomplete video uploads accurately', () => {
  const partial = [
    { index: 0, data: 'AAAA' },
    { index: 2, data: 'CCCC' },
  ];
  assert.deepEqual(getMissingChunkIndices(partial, 4), [1, 3]);
  assert.equal(areCloudChunksComplete(partial, 4), false);
  assert.equal(areCloudChunksComplete([], 1), false);

  const complete = [
    { index: 0, data: 'AAAA' },
    { index: 1, data: 'BBBB' },
    { index: 2, data: 'CCCC' },
  ];
  assert.deepEqual(getMissingChunkIndices(complete, 3), []);
  assert.equal(areCloudChunksComplete(complete, 3), true);
});

test('splitBinaryIntoCloudChunks and reassembleCloudChunksToUint8Array deduplicate and sort out-of-order video chunks', () => {
  const sampleVideoBytes = new Uint8Array(5000);
  for (let i = 0; i < sampleVideoBytes.length; i++) {
    sampleVideoBytes[i] = (i * 31 + 7) % 256;
  }

  const encodedChunks = splitBinaryIntoCloudChunks(sampleVideoBytes, 1500);
  assert.equal(encodedChunks.length, 4);

  // Reverse + duplicate chunk 1 to prove deduplication + index sorting restore exact bytes
  const reversedWithDuplicate = [
    ...encodedChunks.map((data, index) => ({ index, data })).reverse(),
    { index: 1, data: encodedChunks[1] },
  ];

  const restored = reassembleCloudChunksToUint8Array(reversedWithDuplicate);
  assert.equal(restored.length, sampleVideoBytes.length);
  assert.deepEqual(Array.from(restored), Array.from(sampleVideoBytes));
});

test('reassembleCloudChunksToBlob creates valid typed Blob and returns null when empty', async () => {
  assert.equal(reassembleCloudChunksToBlob([], 'video/mp4'), null);

  const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
  const chunks = splitBinaryIntoCloudChunks(bytes, 1024).map((data, index) => ({ index, data }));
  const blob = reassembleCloudChunksToBlob(chunks, 'video/mp4');

  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'video/mp4');
  assert.equal(blob.size, bytes.length);
  const out = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual(Array.from(out), Array.from(bytes));
});
