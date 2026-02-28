import { NextResponse } from 'next/server';
import { readState } from '@/lib/store';
import { verifyPassword } from '@/lib/crypto';
import { createSessionCookieValue, getSessionCookieName } from '@/lib/session';
import { rateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

export async function POST(req) {
  pruneRateLimitBuckets({ maxAgeMs: 60 * 60 * 1000 });
  const rl = rateLimit(req, { keyPrefix: 'login', limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = new NextResponse('Too many requests. Please try again later.', { status: 429 });
    res.headers.set('Retry-After', String(rl.retryAfterSeconds));
    return res;
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const password = String(body.password || '');

  const state = readState();
  if (!state.setup?.complete) {
    return new NextResponse('Setup not completed.', { status: 400 });
  }

  const adminHash = String(state.setup.adminPasswordHash || '');
  const guestHash = String(state.setup.guestPasswordHash || '');

  let role = '';
  if (adminHash && verifyPassword(password, adminHash)) {
    role = 'admin';
  } else if (guestHash && verifyPassword(password, guestHash)) {
    role = 'guest';
  } else {
    return new NextResponse('Invalid password.', { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role });
  const proto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  // Clear any path-scoped cookies that might exist from older builds.
  res.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/login',
    maxAge: 0,
  });
  res.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/api',
    maxAge: 0,
  });
  res.cookies.set('openstream_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('openstream_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/login',
    maxAge: 0,
  });
  res.cookies.set('openstream_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/api',
    maxAge: 0,
  });

  res.cookies.set(getSessionCookieName(), createSessionCookieValue(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
  return res;
}
