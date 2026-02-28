import { NextResponse } from 'next/server';
import { readState, getPublicBaseUrl } from '@/lib/store';

export async function GET() {
  const state = readState();

  const smtpHost = String(state.smtp?.host || '').trim();
  const smtpFrom = String(state.smtp?.from || '').trim();
  const smtpUser = String(state.smtp?.user || '').trim();
  const smtpHasFrom = Boolean(smtpFrom || (smtpUser && smtpUser.includes('@')));

  const enabledServers = (Array.isArray(state.servers) ? state.servers : []).filter((s) => s && s.enabled);
  const enabledServersConfigured = enabledServers.filter((s) => s.baseUrl && s.apiKey).length;

  const publicBaseUrl = getPublicBaseUrl();
  const statePublicBaseUrl = String(state.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const sessionSecretFromEnv = Boolean(String(process.env.OPENSTREAM_SESSION_SECRET || '').trim());

  const seerrUrl = String(state.seerr?.url || '').trim();
  const seerrHasApiKey = Boolean(String(state.seerr?.apiKey || '').trim());

  const ok = Boolean(state.setup?.complete);

  return NextResponse.json({
    ok,
    time: new Date().toISOString(),
    setupComplete: Boolean(state.setup?.complete),
    publicBaseUrlConfigured: Boolean(statePublicBaseUrl || publicBaseUrl),
    publicBaseUrlSource: statePublicBaseUrl ? 'state' : publicBaseUrl ? 'env' : 'origin',
    publicBaseUrlValue: statePublicBaseUrl || publicBaseUrl || '',
    sessionSecretFromEnv,
    smtpConfigured: Boolean(smtpHost && smtpHasFrom),
    enabledServers: enabledServers.length,
    enabledServersConfigured,
    seerrConfigured: Boolean(seerrUrl),
    seerrHasApiKey,
  });
}
