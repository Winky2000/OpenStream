import { NextResponse } from 'next/server';
import { getSession, getSessionCookieName } from '@/lib/session';

function parseCookies(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || '');
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

export async function GET(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || '';
  const ua = req.headers.get('user-agent') || '';
  const session = await getSession();

  return NextResponse.json({
    path: '/login/debug',
    time: new Date().toISOString(),
    host,
    proto,
    userAgent: ua,
    cookieHeader,
    cookies: parseCookies(cookieHeader),
    sessionCookieName: getSessionCookieName(),
    session,
    rsc: Boolean(req.headers.get('rsc')),
    nextAction: req.headers.get('next-action') || '',
    accept: req.headers.get('accept') || '',
  });
}

