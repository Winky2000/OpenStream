import crypto from 'node:crypto';

const PBKDF2_ITERS = 150_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

function b64(buf) {
  return Buffer.from(buf).toString('base64');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(
    Buffer.from(String(password || ''), 'utf8'),
    salt,
    PBKDF2_ITERS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  );
  return `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERS}$${b64(salt)}$${b64(derived)}`;
}

export function verifyPassword(password, stored) {
  try {
    const raw = String(stored || '').trim();
    const parts = raw.split('$');
    if (parts.length !== 5) return false;
    const [kind, digest, itersRaw, saltB64, hashB64] = parts;
    if (kind !== 'pbkdf2') return false;
    const iters = Number(itersRaw);
    if (!Number.isFinite(iters) || iters < 10_000) return false;
    const salt = Buffer.from(String(saltB64 || ''), 'base64');
    const expected = Buffer.from(String(hashB64 || ''), 'base64');
    if (!salt.length || !expected.length) return false;
    const derived = crypto.pbkdf2Sync(
      Buffer.from(String(password || ''), 'utf8'),
      salt,
      iters,
      expected.length,
      String(digest || PBKDF2_DIGEST),
    );
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input || ''), 'utf8').digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
