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
  const proto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  pruneRateLimitBuckets({ maxAgeMs: 60 * 60 * 1000 });
  const rl = rateLimit(req, { keyPrefix: 'login', limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = new NextResponse(null, {
      status: 303,
      headers: {
        Location: '/login?error=rate',
        'Cache-Control': 'no-store',
      },
    });
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
    return new NextResponse(null, {
      status: 303,
      headers: { Location: '/setup', 'Cache-Control': 'no-store' },
    });
  }

  const adminHash = String(state.setup.adminPasswordHash || '');
  const guestHash = String(state.setup.guestPasswordHash || '');

  let role = '';
  if (adminHash && verifyPassword(password, adminHash)) {
    role = 'admin';
  } else if (guestHash && verifyPassword(password, guestHash)) {
    role = 'guest';
  } else {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: '/login?error=invalid', 'Cache-Control': 'no-store' },
    });
  }

  const dest = role === 'admin' ? '/admin' : '/signup';
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: dest, 'Cache-Control': 'no-store' },
  });

  // Clear any path-scoped legacy cookies.
  clearCookie(res, getSessionCookieName(), { secure, path: '/login' });
  clearCookie(res, getSessionCookieName(), { secure, path: '/api' });
  clearCookie(res, 'openstream_session', { secure, path: '/' });
  clearCookie(res, 'openstream_session', { secure, path: '/login' });
  clearCookie(res, 'openstream_session', { secure, path: '/api' });

  res.cookies.set(getSessionCookieName(), createSessionCookieValue(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });

  return res;
}
