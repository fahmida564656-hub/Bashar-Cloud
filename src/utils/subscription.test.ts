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

test('new user on day 0 has non-expiring free lifetime access and full file permissions', () => {
  const start = 1_700_000_000_000;
  const sub = calculateSubscription(start, false, 'none', start);
  assert.equal(sub.isExpired, false);
  assert.equal(sub.isLifetimeApproved, false);
  assert.equal(sub.daysRemaining, 9999);
  assert.equal(canPerformFileAction(sub), true);

  const halfDayLater = calculateSubscription(start, false, 'none', start + 12 * 60 * 60 * 1000);
  assert.equal(halfDayLater.isExpired, false);
  assert.equal(canPerformFileAction(halfDayLater), true);
});

test('free user retains permanent access after 30 days, 1 year, and 10 years without locking', () => {
  const start = 1_700_000_000_000;

  const after30Days = calculateSubscription(start, false, 'none', start + TRIAL_DURATION_MS);
  assert.equal(after30Days.isExpired, false);
  assert.equal(canPerformFileAction(after30Days), true);

  const after1Year = calculateSubscription(start, false, 'none', start + 365 * DAY_MS);
  assert.equal(after1Year.isExpired, false);
  assert.equal(canPerformFileAction(after1Year), true);

  const after10Years = calculateSubscription(start, false, 'none', start + 3650 * DAY_MS);
  assert.equal(after10Years.isExpired, false);
  assert.equal(canPerformFileAction(after10Years), true);
});

test('user with approved VIP lifetime retains VIP flag and full file permissions regardless of elapsed time', () => {
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
