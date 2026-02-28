import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readState, writeState, getPublicBaseUrl } from '@/lib/store';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { sendInviteEmail } from '@/lib/email';
import { getRequestOrigin } from '@/lib/request';

export async function POST(req) {
  const session = getSession();
  if (!session) {
    return new NextResponse('Unauthorized.', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim();
  const serverType = String(body.serverType || 'jellyfin').trim();

  if (!username || username.length > 64) {
    return new NextResponse('Username is required.', { status: 400 });
  }
  if (!email || !email.includes('@') || email.length > 256) {
    return new NextResponse('Valid email is required.', { status: 400 });
  }
  if (serverType !== 'jellyfin' && serverType !== 'emby') {
    return new NextResponse('Invalid serverType.', { status: 400 });
  }

  const state = readState();
  if (!state.smtp?.host || !state.smtp?.from) {
    return new NextResponse('SMTP is not configured. Ask an admin to configure SMTP in /admin/settings.', { status: 400 });
  }

  const token = randomToken(24);
  const tokenHash = sha256Hex(token);
  const baseUrl = getPublicBaseUrl() || getRequestOrigin();
  if (!baseUrl) {
    return new NextResponse('Base URL is not configured.', { status: 500 });
  }

  const inviteUrl = `${baseUrl}/set-password?token=${encodeURIComponent(token)}`;

  const signup = {
    id: randomToken(8),
    createdAt: Date.now(),
    serverType,
    username,
    email,
    status: 'pending_email',
    tokenHash,
    tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    tokenUsedAt: null,
    passwordSetAt: null,
    provisionedAt: null,
    error: '',
  };

  state.signups = Array.isArray(state.signups) ? state.signups : [];
  state.signups.push(signup);
  writeState(state);

  try {
    await sendInviteEmail({ to: email, inviteUrl });
  } catch (e) {
    const state2 = readState();
    const s2 = (state2.signups || []).find((x) => x.id === signup.id);
    if (s2) {
      s2.status = 'email_failed';
      s2.error = String(e?.message || e);
      writeState(state2);
    }
    return new NextResponse(`Failed to send email: ${String(e?.message || e)}`, { status: 500 });
  }

  const state3 = readState();
  const s3 = (state3.signups || []).find((x) => x.id === signup.id);
  if (s3) {
    s3.status = 'invite_sent';
    s3.error = '';
    writeState(state3);
  }

  return NextResponse.json({ ok: true });
}
