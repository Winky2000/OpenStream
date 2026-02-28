import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'openstream_session';

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
function getSecret() {
  if (cachedSecret) return cachedSecret;
  const env = String(process.env.OPENSTREAM_SESSION_SECRET || '').trim();
  if (env) {
    cachedSecret = Buffer.from(env, 'utf8');
    return cachedSecret;
  }
  cachedSecret = crypto.randomBytes(32);
  return cachedSecret;
}

function sign(payloadB64) {
  return base64url(crypto.createHmac('sha256', getSecret()).update(payloadB64, 'utf8').digest());
}

export function setSession(role) {
  const payload = {
    role,
    iat: Date.now(),
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = sign(payloadB64);
  const value = `${payloadB64}.${sig}`;

  cookies().set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function clearSession() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function getSession() {
  const raw = cookies().get(COOKIE_NAME)?.value || '';
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
