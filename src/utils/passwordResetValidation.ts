export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
export const RESET_TOKEN_TTL_MS = 5 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

export function normalizeResetEmail(email?: string): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidResetEmail(email?: string): boolean {
  const normalized = normalizeResetEmail(email);
  if (!normalized || normalized.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

export function sanitizeSixDigitInput(raw?: string): string {
  return typeof raw === 'string' ? raw.replace(/[^0-9]/g, '').slice(0, 6) : '';
}

export function isValidSixDigitCode(code?: string): boolean {
  return typeof code === 'string' && /^\d{6}$/.test(code.trim());
}

export function validateNewPasswordPair(
  newPassword: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `নতুন পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে।`,
    };
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `পাসওয়ার্ড সর্বোচ্চ ${MAX_PASSWORD_LENGTH} অক্ষরের মধ্যে হতে হবে।`,
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      valid: false,
      error: 'পাসওয়ার্ড দুটি মিলছে না। অনুগ্রহ করে একই পাসওয়ার্ড লিখুন।',
    };
  }
  return { valid: true };
}

export function maskEmailAddress(email?: string): string {
  const normalized = normalizeResetEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return normalized;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}
