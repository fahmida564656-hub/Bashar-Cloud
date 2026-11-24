import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPasswordResetEmailContent,
  formatMailTransportError,
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  PasswordResetStore,
  RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  resolveMailProviderCandidates,
  resolveMailProviderConfig,
} from './passwordReset.ts';
import {
  isValidResetEmail,
  isValidSixDigitCode,
  maskEmailAddress,
  sanitizeSixDigitInput,
  validateNewPasswordPair,
} from './passwordResetValidation.ts';

describe('passwordResetValidation', () => {
  it('validates email and six-digit code formats strictly', () => {
    assert.equal(isValidResetEmail('User@Gmail.com '), true);
    assert.equal(isValidResetEmail('bad-email'), false);
    assert.equal(isValidResetEmail('user@domain'), false);

    assert.equal(isValidSixDigitCode('123456'), true);
    assert.equal(isValidSixDigitCode('000123'), false ? false : true);
    assert.equal(isValidSixDigitCode('12345'), false);
    assert.equal(isValidSixDigitCode('12345a'), false);

    assert.equal(sanitizeSixDigitInput('12a 34-567'), '123456');
  });

  it('validates new password strength and confirmation matching', () => {
    assert.equal(validateNewPasswordPair('12345', '12345').valid, false);
    assert.equal(validateNewPasswordPair('123456', '654321').valid, false);
    assert.equal(validateNewPasswordPair('Secret99', 'Secret99').valid, true);
  });

  it('masks email cleanly without exposing full local-part', () => {
    assert.equal(maskEmailAddress('fahmida564656@gmail.com'), 'fa***6@gmail.com');
    assert.equal(maskEmailAddress('ab@gmail.com'), 'a***@gmail.com');
  });
});

describe('PasswordResetStore', () => {
  it('generates 6-digit code, verifies once, issues single-use resetToken, and consumes it', () => {
    let now = 1_700_000_000_000;
    const store = new PasswordResetStore({
      nowFn: () => now,
      randomSixDigitFn: () => 482913,
    });

    const created = store.createChallenge('Test.User@Gmail.com');
    assert.equal(created.ok, true);
    assert.equal(created.email, 'test.user@gmail.com');
    assert.equal(created.code, '482913');
    assert.equal(created.code?.length, 6);

    const verified = store.verifyCode('test.user@gmail.com', '482913');
    assert.equal(verified.ok, true);
    assert.ok(verified.resetToken && verified.resetToken.length >= 32);

    // Code cannot be reused once verified
    const replayCode = store.verifyCode('test.user@gmail.com', '482913');
    assert.equal(replayCode.ok, false);

    // Reset token can be consumed once
    const consumed = store.consumeResetToken('test.user@gmail.com', verified.resetToken!);
    assert.equal(consumed.ok, true);
    assert.equal(consumed.email, 'test.user@gmail.com');

    // Reset token cannot be replayed
    const replayToken = store.consumeResetToken('test.user@gmail.com', verified.resetToken!);
    assert.equal(replayToken.ok, false);
    assert.equal(replayToken.status, 401);
  });

  it('enforces resend cooldown and supports rollback on email delivery failure', () => {
    let now = 1_700_000_000_000;
    const store = new PasswordResetStore({
      nowFn: () => now,
      randomSixDigitFn: () => 112233,
    });

    const first = store.createChallenge('user@gmail.com');
    assert.equal(first.ok, true);

    now += 15_000;
    const tooSoon = store.createChallenge('user@gmail.com');
    assert.equal(tooSoon.ok, false);
    assert.equal(tooSoon.status, 429);
    assert.equal(tooSoon.retryAfterSeconds, 45);

    // Rollback allows immediate retry if SMTP failed
    store.rollbackChallenge('user@gmail.com');
    const afterRollback = store.createChallenge('user@gmail.com');
    assert.equal(afterRollback.ok, true);

    // After full cooldown passes, a new OTP challenge is allowed
    now += RESEND_COOLDOWN_MS;
    const afterCooldown = store.createChallenge('user@gmail.com');
    assert.equal(afterCooldown.ok, true);
  });

  it('locks out OTP after 5 wrong verification attempts', () => {
    const store = new PasswordResetStore({
      nowFn: () => 1_700_000_000_000,
      randomSixDigitFn: () => 900123,
    });

    const created = store.createChallenge('lockout@gmail.com');
    assert.equal(created.ok, true);

    for (let i = 1; i < MAX_OTP_ATTEMPTS; i++) {
      const bad = store.verifyCode('lockout@gmail.com', '000000');
      assert.equal(bad.ok, false);
      assert.equal(bad.remainingAttempts, MAX_OTP_ATTEMPTS - i);
    }

    const locked = store.verifyCode('lockout@gmail.com', '000000');
    assert.equal(locked.ok, false);
    assert.equal(locked.status, 429);
    assert.equal(locked.remainingAttempts, 0);

    // Even the real code is rejected after lockout
    const realAfterLock = store.verifyCode('lockout@gmail.com', '900123');
    assert.equal(realAfterLock.ok, false);
  });

  it('rejects expired OTP codes and expired resetTokens', () => {
    let now = 1_700_000_000_000;
    const store = new PasswordResetStore({
      nowFn: () => now,
      randomSixDigitFn: () => 654321,
    });

    store.createChallenge('expiry@gmail.com');
    now += OTP_TTL_MS + 1;
    const expiredOtp = store.verifyCode('expiry@gmail.com', '654321');
    assert.equal(expiredOtp.ok, false);

    // Verify within window, then let resetToken expire
    store.createChallenge('expiry@gmail.com');
    const verified = store.verifyCode('expiry@gmail.com', '654321');
    assert.equal(verified.ok, true);

    now += RESET_TOKEN_TTL_MS + 1;
    const expiredToken = store.consumeResetToken('expiry@gmail.com', verified.resetToken!);
    assert.equal(expiredToken.ok, false);
    assert.equal(expiredToken.status, 401);
  });

  it('binds resetToken strictly to the verified email', () => {
    const store = new PasswordResetStore({
      randomSixDigitFn: () => 777888,
    });

    store.createChallenge('alice@gmail.com');
    const verified = store.verifyCode('alice@gmail.com', '777888');
    assert.equal(verified.ok, true);

    const wrongEmailConsume = store.consumeResetToken('bob@gmail.com', verified.resetToken!);
    assert.equal(wrongEmailConsume.ok, false);
  });
});

describe('mail provider resolution and email builder', () => {
  it('strips accidental quotes, resolves ordered candidates, and ignores placeholders', () => {
    assert.equal(
      resolveMailProviderConfig({
        SMTP_USER: 'MY_GMAIL_ADDRESS',
        SMTP_PASS: 'MY_GMAIL_APP_PASSWORD',
      }).provider,
      null
    );

    const smtpCfg = resolveMailProviderConfig({
      SMTP_USER: '"sender@gmail.com"',
      SMTP_PASS: "'abcd efgh ijkl mnop'",
    });
    assert.equal(smtpCfg.provider, 'smtp');
    assert.equal(smtpCfg.smtpUser, 'sender@gmail.com');
    assert.equal(smtpCfg.smtpHost, 'smtp.gmail.com');
    assert.equal(smtpCfg.smtpPort, 465);

    const resendCfg = resolveMailProviderConfig({
      RESEND_API_KEY: ' "re_live_123" ',
    });
    assert.equal(resendCfg.provider, 'resend');
    assert.equal(resendCfg.resendApiKey, 're_live_123');

    const candidates = resolveMailProviderCandidates({
      SMTP_USER: 'sender@gmail.com',
      SMTP_PASS: 'apppass',
      RESEND_API_KEY: 're_live_123',
    });
    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].provider, 'smtp');
    assert.equal(candidates[1].provider, 'resend');
  });

  it('classifies Resend 401, Resend 403, and Gmail SMTP auth errors clearly', () => {
    const err401 = formatMailTransportError(
      new Error('Resend API error (401): {"message":"API key is invalid","statusCode":401}')
    );
    assert.equal(err401.code, 'RESEND_INVALID_API_KEY');
    assert.equal(err401.status, 503);
    assert.ok(err401.message.includes('RESEND_API_KEY'));

    const err403 = formatMailTransportError(
      new Error('Resend API error (403): You can only send testing emails to your own email address')
    );
    assert.equal(err403.code, 'RESEND_DOMAIN_RESTRICTED');
    assert.equal(err403.status, 503);

    const errSmtp = formatMailTransportError(
      new Error('Invalid login: 535-5.7.8 Username and Password not accepted')
    );
    assert.equal(errSmtp.code, 'SMTP_AUTH_FAILED');
    assert.equal(errSmtp.status, 503);
  });

  it('escapes HTML appName and includes 6-digit OTP in email content', () => {
    const mail = buildPasswordResetEmailContent({
      code: '543210',
      appName: 'Bashar <Cloud>',
    });
    assert.ok(mail.subject.includes('543210'));
    assert.ok(mail.text.includes('543210'));
    assert.ok(mail.html.includes('543210'));
    assert.ok(mail.html.includes('Bashar &lt;Cloud&gt;'));
  });
});
