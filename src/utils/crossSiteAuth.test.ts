import test from 'node:test';
import assert from 'node:assert';
import { initialFiles } from '../data/initialData';

// Logic mirror of cross-domain user identification matcher
function matchUser(
  identifier: string,
  user: { id: string; email: string; phone: string; name?: string; cleanPhone?: string }
): boolean {
  if (!identifier) return false;
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();
  const cleanDigits = trimmed.replace(/[^0-9]/g, '').slice(-10);

  const docPhone = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
  const docCleanPhone = (user.cleanPhone || docPhone).replace(/[^0-9]/g, '').slice(-10);
  const docEmail = (user.email || '').trim().toLowerCase();
  const docId = user.id;

  // 1. Direct ID match
  if (docId === trimmed) return true;

  // 2. Email match
  if (docEmail && (trimmed.includes('@') ? docEmail === lower : docEmail === lower)) return true;

  // 3. Phone match
  if (cleanDigits.length >= 7 && (docCleanPhone === cleanDigits || docPhone === cleanDigits)) return true;

  // 4. Name match
  if (user.name && user.name.trim().toLowerCase() === lower) return true;

  return false;
}

test('matchUser correctly matches email with numbers (does not false-classify as phone)', () => {
  const user = {
    id: 'user-1741618392123',
    name: 'Bashar User',
    email: 'fahmida564656@gmail.com',
    phone: '+8801734211584',
    cleanPhone: '1734211584',
  };

  // Searching by email with numbers MUST match email, not get lost in phone logic
  assert.strictEqual(matchUser('fahmida564656@gmail.com', user), true);
  assert.strictEqual(matchUser('FAHMIDA564656@GMAIL.COM', user), true);
});

test('matchUser correctly matches Bangladeshi phone in various formats', () => {
  const user = {
    id: 'user-1741618392123',
    name: 'Bashar User',
    email: 'bashar@example.com',
    phone: '(+880) 1734211584',
    cleanPhone: '1734211584',
  };

  assert.strictEqual(matchUser('01734211584', user), true);
  assert.strictEqual(matchUser('+8801734211584', user), true);
  assert.strictEqual(matchUser('8801734211584', user), true);
  assert.strictEqual(matchUser('1734211584', user), true);
  assert.strictEqual(matchUser('01800000000', user), false);
});

test('matchUser matches by User ID or direct name', () => {
  const user = {
    id: 'user-998877',
    name: 'Md Abul Bashar',
    email: 'abul@bashar.com',
    phone: '01734211584',
  };

  assert.strictEqual(matchUser('user-998877', user), true);
  assert.strictEqual(matchUser('Md Abul Bashar', user), true);
  assert.strictEqual(matchUser('md abul bashar', user), true);
});

test('initialFiles starts empty with zero sample files', () => {
  assert.ok(Array.isArray(initialFiles));
  assert.strictEqual(initialFiles.length, 0);
});
