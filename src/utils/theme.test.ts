import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleTheme,
  normalizeTheme,
  THEME_STORAGE_KEY,
} from './theme';

test('toggleTheme correctly toggles between dark and light', () => {
  assert.equal(toggleTheme('dark'), 'light');
  assert.equal(toggleTheme('light'), 'dark');
});

test('normalizeTheme handles valid and invalid inputs safely', () => {
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('custom', 'dark'), 'dark');
  assert.equal(normalizeTheme(null, 'light'), 'light');
  assert.equal(normalizeTheme(undefined, 'dark'), 'dark');
});

test('THEME_STORAGE_KEY is well-defined', () => {
  assert.equal(THEME_STORAGE_KEY, 'bashar_cloud_theme');
});
