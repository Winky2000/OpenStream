import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { getSession, getSessionCookieName, getSessionSecretDiagnostics } from '@/lib/session';
import { instanceId } from '@/lib/instance';
import { debugEndpointsEnabled } from '@/lib/debug';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!debugEndpointsEnabled()) {
    const res = new NextResponse('Not Found', { status: 404 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const h = await headers();
  const c = await cookies();

  const cookieName = getSessionCookieName();
  const raw = c.get(cookieName)?.value || '';
  const session = await getSession();
  const sessionSecret = getSessionSecretDiagnostics();

  const res = NextResponse.json({
    time: new Date().toISOString(),
    instanceId,
    host: h.get('host') || '',
    proto: h.get('x-forwarded-proto') || '',
    cookieName,
    hasCookie: Boolean(raw),
    cookieLength: raw.length,
    session,
    sessionSecret,
  });

  res.headers.set('Cache-Control', 'no-store');
  return res;
}
