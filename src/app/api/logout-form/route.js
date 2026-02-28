import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/session';

export async function POST(req) {
  const proto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  const res = NextResponse.redirect(new URL('/login', req.url), { status: 303 });

  for (const p of ['/', '/login']) {
    res.cookies.set(getSessionCookieName(), '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: p,
      maxAge: 0,
    });
    res.cookies.set('openstream_session', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: p,
      maxAge: 0,
    });
  }

  return res;
}
