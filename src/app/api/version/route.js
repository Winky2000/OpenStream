import { NextResponse } from 'next/server';
import { getSessionCookieName, getSessionSecretDiagnostics } from '@/lib/session';
import { instanceId } from '@/lib/instance';
import { debugEndpointsEnabled } from '@/lib/debug';

export async function GET() {
  const sessionSecretDiagnostics = getSessionSecretDiagnostics();
  const payload = {
    name: 'openstream',
    version: '1.0.0',
    instanceId,
    cookieName: getSessionCookieName(),
    legacyCookieName: 'openstream_session',
    sessionSecret: debugEndpointsEnabled()
      ? sessionSecretDiagnostics
      : {
          source: sessionSecretDiagnostics.source,
          fromEnv: sessionSecretDiagnostics.fromEnv,
        },
    time: new Date().toISOString(),
  };

  const res = NextResponse.json(payload);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
