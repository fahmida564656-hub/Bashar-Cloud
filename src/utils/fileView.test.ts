import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleViewMode,
  isGridMode,
  getImageVisibilityClasses,
  normalizeViewMode,
} from './fileView';

test('toggleViewMode correctly switches between grid and list', () => {
  assert.equal(toggleViewMode('grid'), 'list');
  assert.equal(toggleViewMode('list'), 'grid');
});

test('isGridMode correctly identifies grid mode', () => {
  assert.equal(isGridMode('grid'), true);
  assert.equal(isGridMode('list'), false);
});

test('getImageVisibilityClasses returns distinct styles for grid vs list', () => {
  const gridClasses = getImageVisibilityClasses('grid');
  const listClasses = getImageVisibilityClasses('list');

  assert.ok(gridClasses.container.includes('h-32'));
  assert.ok(listClasses.container.includes('w-10 h-10'));
  assert.notEqual(gridClasses.badge, listClasses.badge);
});

test('normalizeViewMode normalizes inputs safely', () => {
  assert.equal(normalizeViewMode('grid'), 'grid');
  assert.equal(normalizeViewMode('list'), 'list');
  assert.equal(normalizeViewMode('invalid', 'grid'), 'grid');
  assert.equal(normalizeViewMode(null, 'list'), 'list');
});
