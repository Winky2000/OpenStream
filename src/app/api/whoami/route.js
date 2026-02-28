import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { getSession, getSessionCookieName, getSessionSecretDiagnostics } from '@/lib/session';
import { instanceId } from '@/lib/instance';

export const dynamic = 'force-dynamic';

export async function GET() {
  const h = await headers();
  const c = await cookies();

  const cookieName = getSessionCookieName();
  const raw = c.get(cookieName)?.value || '';
  const session = await getSession();
  const sessionSecret = getSessionSecretDiagnostics();

  return NextResponse.json({
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
}
