import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubscription,
  canPerformFileAction,
  validateBangladeshiPhone,
  validateTrxId,
  TRIAL_DURATION_MS,
} from './subscription.js';

test('new user has active 30 days trial and can perform file actions', () => {
  const now = Date.now();
  const sub = calculateSubscription(now, false, 'none');
  assert.equal(sub.isExpired, false);
  assert.equal(sub.isLifetimeApproved, false);
  assert.equal(sub.daysRemaining, 30);
  assert.equal(canPerformFileAction(sub), true);
});

test('user whose registration is older than 30 days is expired and cannot perform file actions', () => {
  const thirtyOneDaysAgo = Date.now() - (TRIAL_DURATION_MS + 24 * 60 * 60 * 1000);
  const sub = calculateSubscription(thirtyOneDaysAgo, false, 'none');
  assert.equal(sub.isExpired, true);
  assert.equal(sub.isLifetimeApproved, false);
  assert.equal(sub.daysRemaining, 0);
  assert.equal(canPerformFileAction(sub), false);
});

test('user with lifetime approval can perform file actions regardless of elapsed time', () => {
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const sub = calculateSubscription(oneYearAgo, true, 'approved');
  assert.equal(sub.isExpired, false);
  assert.equal(sub.isLifetimeApproved, true);
  assert.equal(canPerformFileAction(sub), true);
});

test('simulatedExpired flag correctly sets subscription to expired', () => {
  const now = Date.now();
  const sub = calculateSubscription(now, false, 'none', true);
  assert.equal(sub.isExpired, true);
  assert.equal(canPerformFileAction(sub), false);
});

test('validateBangladeshiPhone correctly checks valid and invalid numbers', () => {
  assert.equal(validateBangladeshiPhone('01734211584'), true);
  assert.equal(validateBangladeshiPhone('+8801734211584'), true);
  assert.equal(validateBangladeshiPhone('01812345678'), true);
  assert.equal(validateBangladeshiPhone('12345'), false);
  assert.equal(validateBangladeshiPhone('02999999999'), false);
});

test('validateTrxId correctly validates bKash/Nagad TrxIDs', () => {
  assert.equal(validateTrxId('BLM49XK2P'), true);
  assert.equal(validateTrxId('9J718K2P'), true);
  assert.equal(validateTrxId('abc'), false); // too short
  assert.equal(validateTrxId('   '), false);
});
