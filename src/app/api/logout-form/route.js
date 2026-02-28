import { NextResponse } from 'next/server';
import { getSessionCookieName } from '@/lib/session';

function getExternalOrigin(req) {
  const xfProto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const xfHost = String(req.headers.get('x-forwarded-host') || '').trim();
  const host = String(req.headers.get('host') || '').trim();

  let proto = xfProto;
  if (!proto) {
    try {
      proto = new URL(req.url).protocol.replace(':', '');
    } catch {
      proto = 'http';
    }
  }
  if (proto !== 'https') proto = 'http';

  const resolvedHost = xfHost || host;
  if (!resolvedHost) return '';
  return `${proto}://${resolvedHost}`;
}

export async function POST(req) {
  const origin = getExternalOrigin(req);
  const secure = origin.startsWith('https://');

  const res = NextResponse.redirect(new URL('/login', origin || req.url), { status: 303 });

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
