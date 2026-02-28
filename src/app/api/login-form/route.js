import { NextResponse } from 'next/server';
import { readState } from '@/lib/store';
import { verifyPassword } from '@/lib/crypto';
import { createSessionCookieValue, getSessionCookieName } from '@/lib/session';
import { rateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

function clearCookie(res, name, { secure, path }) {
  res.cookies.set(name, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path,
    maxAge: 0,
  });
}

export async function POST(req) {
  pruneRateLimitBuckets({ maxAgeMs: 60 * 60 * 1000 });
  const rl = rateLimit(req, { keyPrefix: 'login', limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = NextResponse.redirect(new URL('/login?error=rate', req.url), { status: 303 });
    res.headers.set('Retry-After', String(rl.retryAfterSeconds));
    return res;
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    form = new FormData();
  }

  const password = String(form.get('password') || '');

  const state = readState();
  if (!state.setup?.complete) {
    return NextResponse.redirect(new URL('/setup', req.url), { status: 303 });
  }

  const adminHash = String(state.setup.adminPasswordHash || '');
  const guestHash = String(state.setup.guestPasswordHash || '');

  let role = '';
  if (adminHash && verifyPassword(password, adminHash)) {
    role = 'admin';
  } else if (guestHash && verifyPassword(password, guestHash)) {
    role = 'guest';
  } else {
    return NextResponse.redirect(new URL('/login?error=invalid', req.url), { status: 303 });
  }

  const proto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  const dest = role === 'admin' ? '/admin' : '/signup';
  const res = NextResponse.redirect(new URL(dest, req.url), { status: 303 });

  // Clear any path-scoped legacy cookies.
  clearCookie(res, getSessionCookieName(), { secure, path: '/login' });
  clearCookie(res, 'openstream_session', { secure, path: '/' });
  clearCookie(res, 'openstream_session', { secure, path: '/login' });

  res.cookies.set(getSessionCookieName(), createSessionCookieValue(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });

  return res;
}
