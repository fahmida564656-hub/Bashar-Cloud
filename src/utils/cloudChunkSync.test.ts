import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChunkDocId,
  estimateChunkCount,
  reassembleCloudChunksToBlob,
  reassembleCloudChunksToUint8Array,
  shouldChunkFileToCloud,
  splitBinaryIntoCloudChunks,
} from './cloudChunkSync';

test('shouldChunkFileToCloud only triggers for files larger than inline threshold and within cap', () => {
  assert.equal(shouldChunkFileToCloud(100 * 1024), false);
  assert.equal(shouldChunkFileToCloud(340 * 1024), false);
  assert.equal(shouldChunkFileToCloud(340 * 1024 + 1), true);
  assert.equal(shouldChunkFileToCloud(8 * 1024 * 1024), true);
  assert.equal(shouldChunkFileToCloud(50 * 1024 * 1024), false);
});

test('estimateChunkCount and buildChunkDocId produce deterministic ordered chunk keys', () => {
  assert.equal(estimateChunkCount(0), 0);
  assert.equal(estimateChunkCount(900 * 1024, 420 * 1024), 3);
  assert.equal(buildChunkDocId('file-abc', 0), 'file-abc__chunk_0');
  assert.equal(buildChunkDocId('file-abc', 4), 'file-abc__chunk_4');
});

test('splitBinaryIntoCloudChunks and reassembleCloudChunksToUint8Array round-trip out-of-order video binary losslessly', () => {
  const sampleVideoBytes = new Uint8Array(5000);
  for (let i = 0; i < sampleVideoBytes.length; i++) {
    sampleVideoBytes[i] = (i * 31 + 7) % 256;
  }

  const encodedChunks = splitBinaryIntoCloudChunks(sampleVideoBytes, 1500);
  assert.equal(encodedChunks.length, 4);

  // Reverse order to prove index sorting restores exact binary byte-for-byte
  const reversedRecords = encodedChunks
    .map((data, index) => ({ index, data }))
    .reverse();

  const restored = reassembleCloudChunksToUint8Array(reversedRecords);
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
