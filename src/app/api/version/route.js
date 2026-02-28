import { NextResponse } from 'next/server';
import { getSessionCookieName, getSessionSecretDiagnostics } from '@/lib/session';
import { instanceId } from '@/lib/instance';

export async function GET() {
  return NextResponse.json({
    name: 'openstream',
    version: '1.0.0',
    instanceId,
    cookieName: getSessionCookieName(),
    legacyCookieName: 'openstream_session',
    sessionSecret: getSessionSecretDiagnostics(),
    time: new Date().toISOString(),
  });
}
