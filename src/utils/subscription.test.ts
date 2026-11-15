import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  calculateSubscription,
  canPerformFileAction,
  validateBangladeshiPhone,
  validateTrxId,
  toBengaliDigits,
  TRIAL_DURATION_MS,
} from './subscription.js';

test('new user on day 0 has 30 days remaining and full file permissions', () => {
  const start = 1_700_000_000_000;
  const sub = calculateSubscription(start, false, 'none', start);
  assert.equal(sub.isExpired, false);
  assert.equal(sub.isLifetimeApproved, false);
  assert.equal(sub.daysRemaining, 30);
  assert.equal(canPerformFileAction(sub), true);

  // Even 12 hours into Day 0, still 30 days remaining
  const halfDayLater = calculateSubscription(start, false, 'none', start + 12 * 60 * 60 * 1000);
  assert.equal(halfDayLater.daysRemaining, 30);
  assert.equal(halfDayLater.isExpired, false);
});

test('daily countdown decrements cleanly day by day: 29 after day 1, 28 after day 2, 1 after day 29', () => {
  const start = 1_700_000_000_000;

  const after1Day = calculateSubscription(start, false, 'none', start + 1 * DAY_MS);
  assert.equal(after1Day.daysRemaining, 29);
  assert.equal(after1Day.isExpired, false);
  assert.equal(canPerformFileAction(after1Day), true);

  const after2Days = calculateSubscription(start, false, 'none', start + 2 * DAY_MS);
  assert.equal(after2Days.daysRemaining, 28);
  assert.equal(after2Days.isExpired, false);
  assert.equal(canPerformFileAction(after2Days), true);

  const after29Days = calculateSubscription(start, false, 'none', start + 29 * DAY_MS);
  assert.equal(after29Days.daysRemaining, 1);
  assert.equal(after29Days.isExpired, false);
  assert.equal(canPerformFileAction(after29Days), true);
});

test('user whose 30 days ended is locked (0 days remaining, cannot upload/download/view/rename)', () => {
  const start = 1_700_000_000_000;

  const exact30Days = calculateSubscription(start, false, 'none', start + TRIAL_DURATION_MS);
  assert.equal(exact30Days.isExpired, true);
  assert.equal(exact30Days.isLifetimeApproved, false);
  assert.equal(exact30Days.daysRemaining, 0);
  assert.equal(canPerformFileAction(exact30Days), false);

  const thirtyOneDays = calculateSubscription(start, false, 'none', start + TRIAL_DURATION_MS + DAY_MS);
  assert.equal(thirtyOneDays.isExpired, true);
  assert.equal(thirtyOneDays.daysRemaining, 0);
  assert.equal(canPerformFileAction(thirtyOneDays), false);
});

test('user with approved 100 TK payment unlocks account regardless of elapsed time', () => {
  const start = 1_700_000_000_000;
  const oneYearLater = start + 365 * DAY_MS;
  const sub = calculateSubscription(start, true, 'approved', oneYearLater);
  assert.equal(sub.isExpired, false);
  assert.equal(sub.isLifetimeApproved, true);
  assert.equal(canPerformFileAction(sub), true);
});

test('toBengaliDigits formats numbers cleanly for daily trial messages', () => {
  assert.equal(toBengaliDigits(30), '৩০');
  assert.equal(toBengaliDigits(29), '২৯');
  assert.equal(toBengaliDigits(28), '২৮');
  assert.equal(toBengaliDigits(0), '০');
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
  assert.equal(validateTrxId('abc'), false);
  assert.equal(validateTrxId('   '), false);
});
