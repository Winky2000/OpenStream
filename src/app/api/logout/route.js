import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/session';
import { shouldUseSecureCookies } from '@/lib/http';

export async function POST(req) {
  const secure = shouldUseSecureCookies(req);
  const res = NextResponse.json({ ok: true });

  for (const p of ['/', '/login', '/api']) {
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
