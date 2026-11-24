import crypto from 'node:crypto';
import {
  isValidResetEmail,
  isValidSixDigitCode,
  maskEmailAddress,
  MAX_OTP_ATTEMPTS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeResetEmail,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
} from './passwordResetValidation.ts';

export {
  isValidResetEmail,
  isValidSixDigitCode,
  maskEmailAddress,
  MAX_OTP_ATTEMPTS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeResetEmail,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
};

interface OtpChallengeRecord {
  email: string;
  salt: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

interface ResetTokenRecord {
  email: string;
  tokenHash: string;
  expiresAt: number;
}

export interface CreateChallengeResult {
  ok: boolean;
  status: number;
  email: string;
  maskedEmail?: string;
  code?: string;
  cooldownSeconds?: number;
  retryAfterSeconds?: number;
  expiresInMinutes?: number;
  error?: string;
}

export interface VerifyCodeResult {
  ok: boolean;
  status: number;
  email: string;
  resetToken?: string;
  remainingAttempts?: number;
  expiresInMinutes?: number;
  error?: string;
}

export interface ConsumeResetTokenResult {
  ok: boolean;
  status: number;
  email?: string;
  error?: string;
}

export interface PasswordResetStoreOptions {
  nowFn?: () => number;
  randomSixDigitFn?: () => number;
}

function hashOtpWithSalt(salt: string, code: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

function hashResetToken(token: string, signingKey: string): string {
  return crypto.createHmac('sha256', signingKey).update(token).digest('hex');
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  if (!aHex || !bHex || aHex.length !== bHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aHex, 'hex'), Buffer.from(bHex, 'hex'));
  } catch {
    return false;
  }
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class PasswordResetStore {
  private readonly challenges = new Map<string, OtpChallengeRecord>();
  private readonly resetTokens = new Map<string, ResetTokenRecord>();
  private readonly nowFn: () => number;
  private readonly randomSixDigitFn: () => number;
  private readonly signingKey: string;

  constructor(options: PasswordResetStoreOptions = {}) {
    this.nowFn = options.nowFn || (() => Date.now());
    this.randomSixDigitFn =
      options.randomSixDigitFn || (() => crypto.randomInt(100000, 1000000));
    this.signingKey =
      process.env.RESET_TOKEN_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
  }

  private pruneExpired(now: number): void {
    for (const [email, rec] of this.challenges.entries()) {
      if (now > rec.expiresAt) {
        this.challenges.delete(email);
      }
    }
    for (const [tokenHash, rec] of this.resetTokens.entries()) {
      if (now > rec.expiresAt) {
        this.resetTokens.delete(tokenHash);
      }
    }
  }

  createChallenge(rawEmail: string): CreateChallengeResult {
    const email = normalizeResetEmail(rawEmail);
    if (!isValidResetEmail(email)) {
      return {
        ok: false,
        status: 400,
        email,
        error: 'অনুগ্রহ করে একটি সঠিক জিমেইল / ইমেইল ঠিকানা লিখুন।',
      };
    }

    const now = this.nowFn();
    this.pruneExpired(now);

    const existing = this.challenges.get(email);
    if (existing) {
      const elapsed = now - existing.createdAt;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
        );
        return {
          ok: false,
          status: 429,
          email,
          retryAfterSeconds,
          error: `অনুগ্রহ করে ${retryAfterSeconds} সেকেন্ড অপেক্ষা করে আবার কোড পাঠান।`,
        };
      }
    }

    const numericCode = this.randomSixDigitFn();
    const normalizedNum = Math.min(999999, Math.max(100000, Math.floor(numericCode)));
    const code = String(normalizedNum).padStart(6, '0');
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashOtpWithSalt(salt, code);

    this.challenges.set(email, {
      email,
      salt,
      codeHash,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
    });

    return {
      ok: true,
      status: 200,
      email,
      maskedEmail: maskEmailAddress(email),
      code,
      cooldownSeconds: Math.round(RESEND_COOLDOWN_MS / 1000),
      expiresInMinutes: Math.round(OTP_TTL_MS / 60000),
    };
  }

  rollbackChallenge(rawEmail: string): void {
    const email = normalizeResetEmail(rawEmail);
    if (email) {
      this.challenges.delete(email);
    }
  }

  verifyCode(rawEmail: string, rawCode: string): VerifyCodeResult {
    const email = normalizeResetEmail(rawEmail);
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';

    if (!isValidResetEmail(email)) {
      return {
        ok: false,
        status: 400,
        email,
        error: 'সঠিক জিমেইল / ইমেইল ঠিকানা প্রয়োজন।',
      };
    }

    if (!isValidSixDigitCode(code)) {
      return {
        ok: false,
        status: 400,
        email,
        error: 'অনুগ্রহ করে ৬ সংখ্যার সঠিক কোড লিখুন।',
      };
    }

    const now = this.nowFn();
    const record = this.challenges.get(email);
    if (!record) {
      return {
        ok: false,
        status: 400,
        email,
        error: 'কোনো সক্রিয় কোড পাওয়া যায়নি। অনুগ্রহ করে নতুন করে কোড পাঠান।',
      };
    }

    if (now > record.expiresAt) {
      this.challenges.delete(email);
      return {
        ok: false,
        status: 400,
        email,
        error: 'কোডটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে নতুন ৬ সংখ্যার কোড পাঠান।',
      };
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      this.challenges.delete(email);
      return {
        ok: false,
        status: 429,
        email,
        remainingAttempts: 0,
        error: 'অনেকবার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে নতুন করে কোড পাঠান।',
      };
    }

    const expectedHash = hashOtpWithSalt(record.salt, code);
    const matched = safeEqualHex(expectedHash, record.codeHash);

    if (!matched) {
      record.attempts += 1;
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - record.attempts);
      if (remaining === 0) {
        this.challenges.delete(email);
        return {
          ok: false,
          status: 429,
          email,
          remainingAttempts: 0,
          error: '৫ বার ভুল কোড দেওয়ার কারণে এই কোডটি বাতিল হয়েছে। অনুগ্রহ করে নতুন কোড পাঠান।',
        };
      }
      return {
        ok: false,
        status: 400,
        email,
        remainingAttempts: remaining,
        error: `ভুল কোড! আর ${remaining} বার চেষ্টা করতে পারবেন।`,
      };
    }

    // Consume OTP on success and issue single-use resetToken bound to email
    this.challenges.delete(email);

    // Invalidate any prior unused reset token for the same email
    for (const [tokenHash, tok] of this.resetTokens.entries()) {
      if (tok.email === email) {
        this.resetTokens.delete(tokenHash);
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken, this.signingKey);
    this.resetTokens.set(tokenHash, {
      email,
      tokenHash,
      expiresAt: now + RESET_TOKEN_TTL_MS,
    });

    return {
      ok: true,
      status: 200,
      email,
      resetToken,
      expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    };
  }

  consumeResetToken(rawEmail: string, rawToken: string): ConsumeResetTokenResult {
    const email = normalizeResetEmail(rawEmail);
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (!isValidResetEmail(email) || !token) {
      return {
        ok: false,
        status: 400,
        error: 'অবৈধ রিসেট অনুরোধ। অনুগ্রহ করে আবার কোড যাচাই করুন।',
      };
    }

    const now = this.nowFn();
    this.pruneExpired(now);

    const tokenHash = hashResetToken(token, this.signingKey);
    const record = this.resetTokens.get(tokenHash);
    if (!record || record.email !== email || now > record.expiresAt) {
      if (record) this.resetTokens.delete(tokenHash);
      return {
        ok: false,
        status: 401,
        error: 'পাসওয়ার্ড পরিবর্তনের অনুমতি মেয়াদোত্তীর্ণ বা অবৈধ। আবার কোড যাচাই করুন।',
      };
    }

    // Single-use token: delete immediately on consumption
    this.resetTokens.delete(tokenHash);
    return {
      ok: true,
      status: 200,
      email,
    };
  }
}

export function buildPasswordResetEmailContent(params: {
  code: string;
  appName?: string;
}): { subject: string; text: string; html: string } {
  const safeAppName = (params.appName || 'Bashar Cloud').trim() || 'Bashar Cloud';
  const htmlAppName = escapeHtml(safeAppName);
  const safeCode = escapeHtml(params.code);

  const subject = `${safeAppName} পাসওয়ার্ড রিসেট কোড: ${params.code}`;
  const text = [
    `${safeAppName} — পাসওয়ার্ড পরিবর্তন যাচাইকরণ`,
    '',
    `আপনার ৬ সংখ্যার ভেরিফিকেশন কোডটি হলো: ${params.code}`,
    '',
    'এই কোডটি আগামী ১০ মিনিটের জন্য কার্যকর থাকবে। নিরাপত্তার স্বার্থে কোডটি কারো সাথে শেয়ার করবেন না।',
    'আপনি যদি এই অনুরোধ না করে থাকেন, তবে অনুগ্রহ করে এই ইমেইলটি উপেক্ষা করুন।',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#09111e; color:#f1f5f9; padding:32px 16px;">
      <div style="max-width:460px; margin:0 auto; background:#0f172a; border:1px solid #1e293b; border-radius:16px; padding:28px;">
        <h2 style="margin:0 0 8px; font-size:20px; color:#ffffff;">${htmlAppName}</h2>
        <p style="margin:0 0 20px; font-size:14px; color:#94a3b8; line-height:1.6;">
          আপনার অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তনের জন্য নিচের ৬ সংখ্যার ভেরিফিকেশন কোডটি ব্যবহার করুন:
        </p>
        <div style="background:#172554; border:1px solid #2563eb; border-radius:12px; padding:18px; text-align:center; margin-bottom:20px;">
          <span style="font-size:32px; font-weight:800; letter-spacing:8px; color:#ffffff; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${safeCode}</span>
        </div>
        <p style="margin:0 0 8px; font-size:13px; color:#cbd5e1; line-height:1.5;">
          এই কোডটি আগামী <strong>১০ মিনিটের</strong> জন্য কার্যকর থাকবে।
        </p>
        <p style="margin:0; font-size:12px; color:#64748b; line-height:1.5;">
          নিরাপত্তার স্বার্থে কোডটি কারো সাথে শেয়ার করবেন না। আপনি এই অনুরোধ না করে থাকলে ইমেইলটি উপেক্ষা করুন।
        </p>
      </div>
    </div>
  `.trim();

  return { subject, text, html };
}

export interface MailProviderConfig {
  provider: 'resend' | 'smtp' | null;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromAddress?: string;
}

export function resolveMailProviderConfig(
  env: Record<string, string | undefined>
): MailProviderConfig {
  const resendApiKey = env.RESEND_API_KEY?.trim() || '';
  const smtpUser = env.SMTP_USER?.trim() || '';
  const smtpPass = env.SMTP_PASS?.trim() || '';
  const smtpHost = env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const smtpPort = Number(env.SMTP_PORT) || 465;
  const fromOverride = env.SMTP_FROM?.trim() || '';

  if (smtpUser && smtpPass && smtpUser !== 'MY_GMAIL_ADDRESS' && smtpPass !== 'MY_GMAIL_APP_PASSWORD') {
    return {
      provider: 'smtp',
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromAddress: fromOverride || smtpUser,
    };
  }

  if (resendApiKey) {
    return {
      provider: 'resend',
      resendApiKey,
      fromAddress: fromOverride || 'Bashar Cloud <onboarding@resend.dev>',
    };
  }

  return { provider: null };
}
