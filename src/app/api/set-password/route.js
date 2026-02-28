import { NextResponse } from 'next/server';
import { readState, updateStateLocked, addAuditEvent } from '@/lib/store';
import { sha256Hex } from '@/lib/crypto';
import { provisionUser } from '@/lib/media';
import { importJellyfinUserToSeerr } from '@/lib/seerr';
import { rateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

export async function POST(req) {
  pruneRateLimitBuckets({ maxAgeMs: 60 * 60 * 1000 });
  const rl = rateLimit(req, { keyPrefix: 'set-password', limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = new NextResponse('Too many requests. Please try again later.', { status: 429 });
    res.headers.set('Retry-After', String(rl.retryAfterSeconds));
    return res;
  }

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

  // Prevent double-submits from starting multiple provisions at once.
  const startedAt = Number(signup.provisioningStartedAt || 0);
  if (signup.status === 'provisioning' && startedAt && (Date.now() - startedAt) < 2 * 60 * 1000) {
    return new NextResponse('Provisioning is already in progress. Please wait a moment and refresh.', { status: 409 });
  }

  signup.provisioningStartedAt = Date.now();
  signup.status = 'provisioning';
  signup.error = '';
  await updateStateLocked((s) => {
    const s1 = (s.signups || []).find((x) => x.id === signup.id);
    if (s1) {
      s1.provisioningStartedAt = signup.provisioningStartedAt;
      s1.status = 'provisioning';
      s1.error = '';
    }
    addAuditEvent(s, {
      type: 'provisioning_started',
      actor: 'invite',
      message: 'Provisioning started.',
      meta: { signupId: signup.id, serverType: signup.serverType, username: signup.username },
    });
    return s;
  });

  try {
    const seerrCfg = {
      url: String(state.seerr?.url || '').trim(),
      apiKey: String(state.seerr?.apiKey || '').trim(),
      setLocalPassword: state.seerr?.setLocalPassword !== false,
    };
    let seerrResult = {
      attempted: false,
      ok: false,
      skippedReason: '',
      error: '',
    };

    const servers = Array.isArray(state.servers) ? state.servers : [];
    let serverCfg = null;
    if (signup.serverId) {
      serverCfg = servers.find((s) => s.id === signup.serverId) || null;
    }
    if (!serverCfg && signup.serverType) {
      serverCfg = servers.find((s) => s.enabled && s.type === signup.serverType) || null;
    }
    if (!serverCfg || !serverCfg.baseUrl || !serverCfg.apiKey) {
      throw new Error('Server is not configured or is disabled.');
    }

    const { userId } = await provisionUser({
      serverType: serverCfg.type,
      baseUrl: serverCfg.baseUrl,
      apiKey: serverCfg.apiKey,
      username: signup.username,
      password,
      libraryIds: Array.isArray(signup.requestedLibraryIds) ? signup.requestedLibraryIds : null,
    });

    if (seerrCfg.url && seerrCfg.apiKey) {
      if (serverCfg.type !== 'jellyfin') {
        seerrResult = {
          attempted: false,
          ok: false,
          skippedReason: 'Requests import only supports Jellyfin users.',
          error: '',
        };
      } else if (!userId) {
        seerrResult = {
          attempted: false,
          ok: false,
          skippedReason: 'Missing Jellyfin user id from provisioning.',
          error: '',
        };
      } else {
        seerrResult.attempted = true;
        try {
          await importJellyfinUserToSeerr({
            seerrUrl: seerrCfg.url,
            apiKey: seerrCfg.apiKey,
            jellyfinUserId: userId,
            email: signup.email,
            username: signup.username,
            password: seerrCfg.setLocalPassword ? password : '',
          });
          seerrResult.ok = true;
          // Audit: Seerr import success (or create success via fallback).
          await updateStateLocked((s) => {
            addAuditEvent(s, {
              type: 'seerr_user_ok',
              actor: 'system',
              message: 'Seerr user import/create succeeded.',
              meta: { signupId: signup.id },
            });
            return s;
          });
        } catch (err) {
          const msg = err && typeof err === 'object' && 'message' in err ? String(err.message || '') : String(err || '');
          seerrResult.ok = false;
          seerrResult.error = msg || 'Seerr import failed.';
          console.warn('Seerr import failed:', msg);

          await updateStateLocked((s) => {
            addAuditEvent(s, {
              type: 'seerr_user_failed',
              actor: 'system',
              message: 'Seerr user import/create failed.',
              meta: { signupId: signup.id, error: String(msg || '').slice(0, 500) },
            });
            return s;
          });
        }
      }
    }

    await updateStateLocked((s) => {
      const s2 = (s.signups || []).find((x) => x.id === signup.id);
      if (s2) {
        s2.status = 'provisioned';
        s2.tokenUsedAt = Date.now();
        s2.passwordSetAt = Date.now();
        s2.provisionedAt = Date.now();
        s2.provisioningStartedAt = 0;
        // Keep provisioning success, but preserve non-fatal Seerr import info for debugging.
        s2.seerrImport = {
          attempted: Boolean(seerrResult.attempted),
          ok: Boolean(seerrResult.ok),
          skippedReason: String(seerrResult.skippedReason || ''),
          error: String(seerrResult.error || ''),
          at: Date.now(),
        };

        // If Seerr was configured but we couldn't import, surface a short message in the existing Error column.
        if (seerrCfg.url && seerrCfg.apiKey && (!seerrResult.ok)) {
          const short = seerrResult.attempted
            ? `Seerr import failed: ${String(seerrResult.error || '').slice(0, 240)}`
            : `Seerr import skipped: ${String(seerrResult.skippedReason || '').slice(0, 240)}`;
          s2.error = short;
        } else {
          s2.error = '';
        }
      }

      addAuditEvent(s, {
        type: 'provisioning_succeeded',
        actor: 'invite',
        message: 'Provisioning completed successfully.',
        meta: { signupId: signup.id, serverType: signup.serverType, username: signup.username },
      });
      return s;
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    await updateStateLocked((s) => {
      const s2 = (s.signups || []).find((x) => x.id === signup.id);
      if (s2) {
        s2.status = 'provision_failed';
        s2.error = String(e?.message || e);
        s2.provisioningStartedAt = 0;
        // Keep token valid so the user can retry after fixing config.
        s2.tokenUsedAt = null;
      }

      addAuditEvent(s, {
        type: 'provisioning_failed',
        actor: 'invite',
        message: 'Provisioning failed.',
        meta: { signupId: signup.id, error: String(e?.message || e).slice(0, 500) },
      });
      return s;
    });

    return new NextResponse(`Provisioning failed: ${String(e?.message || e)}`, { status: 500 });
  }
}
