import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readState, updateStateLocked, getPublicBaseUrl, addAuditEvent } from '@/lib/store';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { sendInviteEmail } from '@/lib/email';
import { getRequestOrigin } from '@/lib/request';
import { rateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

export async function POST(req) {
  pruneRateLimitBuckets({ maxAgeMs: 60 * 60 * 1000 });
  const rl = rateLimit(req, { keyPrefix: 'signup', limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = new NextResponse('Too many requests. Please try again later.', { status: 429 });
    res.headers.set('Retry-After', String(rl.retryAfterSeconds));
    return res;
  }

  const session = await getSession();
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
  const serverId = String(body.serverId || '').trim();
  const serverType = String(body.serverType || '').trim();
  const requestedLibraryIdsRaw = Array.isArray(body.requestedLibraryIds) ? body.requestedLibraryIds : [];
  const requestedLibraryIds = requestedLibraryIdsRaw.map((x) => String(x)).filter(Boolean);

  if (!username || username.length > 64) {
    return new NextResponse('Username is required.', { status: 400 });
  }
  if (!email || !email.includes('@') || email.length > 256) {
    return new NextResponse('Valid email is required.', { status: 400 });
  }

  const state = readState();
  const smtpHost = String(state.smtp?.host || '').trim();
  const smtpFrom = String(state.smtp?.from || '').trim();
  const smtpUser = String(state.smtp?.user || '').trim();
  const hasFrom = Boolean(smtpFrom || (smtpUser && smtpUser.includes('@')));
  if (!smtpHost || !hasFrom) {
    return new NextResponse(
      'SMTP is not configured. Ask an admin to configure SMTP in /admin/settings.',
      { status: 400 },
    );
  }

  const servers = Array.isArray(state.servers) ? state.servers : [];
  let server = null;
  if (serverId) {
    server = servers.find((s) => s.id === serverId) || null;
  } else if (serverType) {
    if (serverType !== 'jellyfin' && serverType !== 'emby') {
      return new NextResponse('Invalid serverType.', { status: 400 });
    }
    server = servers.find((s) => s.enabled && s.type === serverType) || null;
  }

  if (!server) {
    return new NextResponse('Server is not available. Ask an admin to enable a server in /admin/settings.', { status: 400 });
  }
  if (!server.enabled) {
    return new NextResponse('Server is disabled. Choose a different server.', { status: 400 });
  }
  if (!server.baseUrl || !server.apiKey) {
    return new NextResponse('Server is missing baseUrl/apiKey. Ask an admin to finish configuring it.', { status: 400 });
  }

  const libraries = Array.isArray(server.libraries) ? server.libraries : [];
  const offeredIds = Array.isArray(server.offeredLibraryIds)
    ? server.offeredLibraryIds.map((x) => String(x)).filter(Boolean)
    : libraries.map((l) => String(l.id)).filter(Boolean);
  const offeredSet = new Set(offeredIds);
  const filteredRequested = requestedLibraryIds.filter((id) => offeredSet.has(id));
  const finalRequestedLibraryIds = filteredRequested.length > 0 ? filteredRequested : offeredIds;

  const token = randomToken(24);
  const tokenHash = sha256Hex(token);
  const origin = await getRequestOrigin();
  const statePublic = String(state.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const baseUrl = statePublic || getPublicBaseUrl() || origin;
  if (!baseUrl) {
    return new NextResponse('Base URL is not configured.', { status: 500 });
  }

  const inviteUrl = `${baseUrl}/set-password?token=${encodeURIComponent(token)}`;

  const signup = {
    id: randomToken(8),
    createdAt: Date.now(),
    serverId: server.id,
    serverType: server.type,
    serverName: server.name,
    username,
    email,
    requestedLibraryIds: finalRequestedLibraryIds,
    status: 'pending_email',
    tokenHash,
    tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    tokenUsedAt: null,
    passwordSetAt: null,
    provisionedAt: null,
    error: '',
  };

  await updateStateLocked((s) => {
    s.signups = Array.isArray(s.signups) ? s.signups : [];
    s.signups.push(signup);
    addAuditEvent(s, {
      type: 'signup_created',
      actor: session.role,
      message: 'Signup request created.',
      meta: { signupId: signup.id, serverId: signup.serverId, serverType: signup.serverType, username },
    });
    return s;
  });

  try {
    await sendInviteEmail({ to: email, inviteUrl });
  } catch (e) {
    await updateStateLocked((s) => {
      const s2 = (s.signups || []).find((x) => x.id === signup.id);
      if (s2) {
        s2.status = 'email_failed';
        s2.error = String(e?.message || e);
      }
      addAuditEvent(s, {
        type: 'invite_email_failed',
        actor: 'system',
        message: 'Invite email failed to send.',
        meta: { signupId: signup.id, error: String(e?.message || e).slice(0, 500) },
      });
      return s;
    });
    return new NextResponse(`Failed to send email: ${String(e?.message || e)}`, { status: 500 });
  }

  await updateStateLocked((s) => {
    const s3 = (s.signups || []).find((x) => x.id === signup.id);
    if (s3) {
      s3.status = 'invite_sent';
      s3.error = '';
    }
    addAuditEvent(s, {
      type: 'invite_sent',
      actor: 'system',
      message: 'Invite email sent.',
      meta: { signupId: signup.id },
    });
    return s;
  });

  return NextResponse.json({ ok: true });
}
