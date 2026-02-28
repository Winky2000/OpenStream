import { NextResponse } from 'next/server';
import { readState, writeState } from '@/lib/store';
import { sha256Hex } from '@/lib/crypto';
import { provisionUser } from '@/lib/media';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const token = String(body.token || '').trim();
  const password = String(body.password || '');

  if (!token) {
    return new NextResponse('Missing token.', { status: 400 });
  }
  if (password.length < 8) {
    return new NextResponse('Password must be at least 8 characters.', { status: 400 });
  }

  const tokenHash = sha256Hex(token);
  const state = readState();
  const signups = Array.isArray(state.signups) ? state.signups : [];
  const signup = signups.find((s) => s.tokenHash === tokenHash);

  if (!signup) {
    return new NextResponse('Invalid token.', { status: 400 });
  }
  if (signup.tokenUsedAt) {
    return new NextResponse('This link was already used.', { status: 400 });
  }
  if (Number(signup.tokenExpiresAt || 0) < Date.now()) {
    return new NextResponse('This link has expired.', { status: 400 });
  }

  signup.tokenUsedAt = Date.now();
  signup.passwordSetAt = Date.now();
  signup.status = 'provisioning';
  signup.error = '';
  writeState(state);

  try {
    const serverCfg = state.servers?.[signup.serverType] || {};
    await provisionUser({
      serverType: signup.serverType,
      baseUrl: serverCfg.baseUrl,
      apiKey: serverCfg.apiKey,
      username: signup.username,
      password,
    });

    const state2 = readState();
    const s2 = (state2.signups || []).find((s) => s.id === signup.id);
    if (s2) {
      s2.status = 'provisioned';
      s2.provisionedAt = Date.now();
      s2.error = '';
      writeState(state2);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const state2 = readState();
    const s2 = (state2.signups || []).find((s) => s.id === signup.id);
    if (s2) {
      s2.status = 'provision_failed';
      s2.error = String(e?.message || e);
      writeState(state2);
    }

    return new NextResponse(`Provisioning failed: ${String(e?.message || e)}`, { status: 500 });
  }
}
