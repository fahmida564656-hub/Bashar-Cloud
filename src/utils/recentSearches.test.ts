import test from 'node:test';
import assert from 'node:assert/strict';
import { addTermToList, removeTermFromList, MAX_RECENT_SEARCHES } from './recentSearches.js';

test('addTermToList adds a new search term to the beginning', () => {
  const initial = ['documents', 'invoices'];
  const updated = addTermToList(initial, 'photos');
  assert.deepEqual(updated, ['photos', 'documents', 'invoices']);
});

test('addTermToList ignores empty or whitespace-only terms', () => {
  const initial = ['photos'];
  const updated = addTermToList(initial, '   ');
  assert.deepEqual(updated, ['photos']);
});

test('addTermToList moves existing term to the front without duplicates (case-insensitive)', () => {
  const initial = ['documents', 'photos', 'videos'];
  const updated = addTermToList(initial, 'Photos');
  assert.deepEqual(updated, ['Photos', 'documents', 'videos']);
});

test('addTermToList respects maxCount limit', () => {
  const initial = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const updated = addTermToList(initial, '9', MAX_RECENT_SEARCHES);
  assert.equal(updated.length, MAX_RECENT_SEARCHES);
  assert.equal(updated[0], '9');
  assert.equal(updated.includes('8'), false); // oldest element dropped
});

test('removeTermFromList removes term case-insensitively', () => {
  const initial = ['photos', 'documents', 'videos'];
  const updated = removeTermFromList(initial, 'PHOTOS');
  assert.deepEqual(updated, ['documents', 'videos']);
});
