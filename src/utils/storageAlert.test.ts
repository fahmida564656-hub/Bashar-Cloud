import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStorageWarningThreshold,
  getStorageAlertLevel,
  getStorageAlertStyles,
} from './storageAlert.js';

test('isStorageWarningThreshold returns false below 90%', () => {
  assert.equal(isStorageWarningThreshold(0, 1000), false);
  assert.equal(isStorageWarningThreshold(899, 1000), false);
  assert.equal(isStorageWarningThreshold(500, 1000), false);
});

test('isStorageWarningThreshold returns true at or above 90%', () => {
  assert.equal(isStorageWarningThreshold(900, 1000), true);
  assert.equal(isStorageWarningThreshold(950, 1000), true);
  assert.equal(isStorageWarningThreshold(1000, 1000), true);
});

test('getStorageAlertLevel classifies levels properly', () => {
  assert.equal(getStorageAlertLevel(100, 1000), 'normal');
  assert.equal(getStorageAlertLevel(899.9, 1000), 'normal');
  assert.equal(getStorageAlertLevel(900, 1000), 'warning');
  assert.equal(getStorageAlertLevel(950, 1000), 'warning');
  assert.equal(getStorageAlertLevel(1000, 1000), 'critical');
  assert.equal(getStorageAlertLevel(1050, 1000), 'critical');
});

test('getStorageAlertStyles returns distinct styles for warning vs normal', () => {
  const normalStyles = getStorageAlertStyles('normal');
  const warningStyles = getStorageAlertStyles('warning');

  assert.notEqual(normalStyles.barGradient, warningStyles.barGradient);
  assert.ok(warningStyles.barGradient.includes('amber'));
  assert.ok(warningStyles.alertTitle.includes('90%'));
});
