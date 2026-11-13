import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialVersion, ensureFileVersions, appendFileVersion } from './fileVersioning';
import { CloudFile } from '../types';

test('createInitialVersion generates valid v1 with Created action', () => {
  const initial = createInitialVersion({
    id: 'f-123',
    name: 'document.pdf',
    sizeBytes: 1024,
    formattedSize: '1 KB',
    date: 'Mar 10, 2026',
  }, 'Bashar');

  assert.equal(initial.versionNumber, 1);
  assert.equal(initial.action, 'Created');
  assert.equal(initial.modifiedBy, 'Bashar');
  assert.equal(initial.name, 'document.pdf');
});

test('ensureFileVersions guarantees version history exists', () => {
  const fileWithoutVersions: CloudFile = {
    id: 'f-456',
    name: 'photo.png',
    type: 'image',
    sizeBytes: 2048,
    formattedSize: '2 KB',
    date: 'Mar 11, 2026',
    isFavorite: false,
  };

  const versions = ensureFileVersions(fileWithoutVersions);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].versionNumber, 1);
});

test('appendFileVersion prepends new version with Renamed or Modified action', () => {
  const file: CloudFile = {
    id: 'f-789',
    name: 'draft.txt',
    type: 'document',
    sizeBytes: 500,
    formattedSize: '500 B',
    date: 'Mar 10, 2026',
    isFavorite: false,
  };

  const renamed = appendFileVersion(file, 'Renamed', {
    newName: 'final_report.txt',
    note: 'Renamed from draft.txt to final_report.txt',
  });

  assert.equal(renamed.name, 'final_report.txt');
  assert.equal(renamed.versions?.length, 2);
  assert.equal(renamed.versions?.[0].action, 'Renamed');
  assert.equal(renamed.versions?.[0].versionNumber, 2);
  assert.equal(renamed.versions?.[1].action, 'Created');
});
