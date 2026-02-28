import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { getResolvedDataPath } from '@/lib/store';

const COOKIE_NAME = 'openstream_session_v2';
const LEGACY_COOKIE_NAME = 'openstream_session';

const CLEAR_PATHS = ['/', '/login', '/api'];

function clearCookiePaths(cookieJar, name, paths, { secure }) {
  for (const p of paths) {
    cookieJar.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: p,
      maxAge: 0,
    });
  }
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlToBuf(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

let cachedSecret = null;
let warnedProdSecret = false;

let cachedSecretSource = 'unknown';
let cachedSecretPath = '';

function getSecretPath() {
  const resolvedDataPath = getResolvedDataPath();
  return path.join(path.dirname(resolvedDataPath), 'openstream.session_secret');
}

function fileAccessFlags(p) {
  const exists = fs.existsSync(p);
  let readable = false;
  let writable = false;
  if (exists) {
    try {
      fs.accessSync(p, fs.constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }
    try {
      fs.accessSync(p, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  } else {
    const dir = path.dirname(p);
    try {
      fs.accessSync(dir, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  }
  return { exists, readable, writable };
}

export function getSessionSecretDiagnostics() {
  // Force the secret to load so `source` is meaningful.
  try {
    getSecret();
  } catch {
    // ignore; diagnostics will still show file access
  }
  const p = cachedSecretPath || getSecretPath();
  const access = fileAccessFlags(p);
  return {
    source: cachedSecretSource,
    fromEnv: Boolean(String(process.env.OPENSTREAM_SESSION_SECRET || '').trim()),
    path: p,
    file: access,
  };
}

function getSecret() {
  if (cachedSecret) return cachedSecret;
  const env = String(process.env.OPENSTREAM_SESSION_SECRET || '').trim();
  if (env) {
    cachedSecret = Buffer.from(env, 'utf8');
    cachedSecretSource = 'env';
    cachedSecretPath = '';
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production' && !warnedProdSecret) {
    warnedProdSecret = true;
    console.warn(
      '[OpenStream] OPENSTREAM_SESSION_SECRET is not set; using a generated secret stored under data/. Set OPENSTREAM_SESSION_SECRET for stable sessions across redeploys.',
    );
  }

  // Dev/default: persist a generated secret so sessions survive reloads/workers.
  const secretPath = getSecretPath();
  cachedSecretPath = secretPath;
  try {
    if (fs.existsSync(secretPath)) {
      const raw = String(fs.readFileSync(secretPath, 'utf8') || '').trim();
      if (raw) {
        cachedSecret = Buffer.from(raw, 'utf8');
        cachedSecretSource = 'file';
        return cachedSecret;
      }
    }
  } catch {
    // fallthrough
  }

  const generated = base64url(crypto.randomBytes(32));
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    // Use wx for best-effort atomic create; if it already exists, we'll read it.
    fs.writeFileSync(secretPath, generated, { encoding: 'utf8', flag: 'wx' });
    cachedSecret = Buffer.from(generated, 'utf8');
    cachedSecretSource = 'file';
    return cachedSecret;
  } catch {
    try {
      const raw = String(fs.readFileSync(secretPath, 'utf8') || '').trim();
      if (raw) {
        cachedSecret = Buffer.from(raw, 'utf8');
        cachedSecretSource = 'file';
        return cachedSecret;
      }
    } catch {
      // fallthrough
    }
  }

  // Last resort (should be rare): in-memory secret.
  cachedSecret = crypto.randomBytes(32);
  cachedSecretSource = 'memory';
  return cachedSecret;
}

function sign(payloadB64) {
  return base64url(crypto.createHmac('sha256', getSecret()).update(payloadB64, 'utf8').digest());
}

export function createSessionCookieValue(role) {
  const payload = {
    role,
    iat: Date.now(),
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function setSession(role) {
  const value = createSessionCookieValue(role);

  const h = await headers();
  const proto = String(h.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  const c = await cookies();

  // Best-effort: clear any legacy or path-scoped cookies to avoid redirect loops.
  // (Older builds may have created cookies scoped to Path=/login by default.)
  clearCookiePaths(c, COOKIE_NAME, ['/login', '/api'], { secure });
  clearCookiePaths(c, LEGACY_COOKIE_NAME, CLEAR_PATHS, { secure });

  c.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}

export async function clearSession() {
  const h = await headers();
  const proto = String(h.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  const c = await cookies();
  clearCookiePaths(c, COOKIE_NAME, CLEAR_PATHS, { secure });
  clearCookiePaths(c, LEGACY_COOKIE_NAME, CLEAR_PATHS, { secure });
}

export async function getSession() {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value || '';
  const [payloadB64, sig] = raw.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const json = base64urlToBuf(payloadB64).toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return null;
    if (payload.role !== 'admin' && payload.role !== 'guest') return null;
    return payload;
  } catch {
    return null;
  }
}
