import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { updateStateLocked } from '@/lib/store';
import { randomToken } from '@/lib/crypto';

function normalizeBaseUrl(raw) {
  const s = String(raw || '').trim();
  return s.replace(/\/+$/, '');
}

export async function POST(req) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Unauthorized.', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = String(body.id || '').trim();
  const type = String(body.type || '').trim();
  const name = String(body.name || '').trim();
  const baseUrl = normalizeBaseUrl(body.baseUrl);
  const connectionUrl = normalizeBaseUrl(body.connectionUrl);
  const apiKey = String(body.apiKey || '');
  const enabled = Boolean(body.enabled);

  if (type !== 'jellyfin' && type !== 'emby') {
    return new NextResponse('Invalid type.', { status: 400 });
  }
  if (!name) {
    return new NextResponse('Name is required.', { status: 400 });
  }
  if (!baseUrl) {
    return new NextResponse('Base URL is required.', { status: 400 });
  }

  try {
    await updateStateLocked((state) => {
      state.servers = Array.isArray(state.servers) ? state.servers : [];

      if (id) {
        const existing = state.servers.find((s) => s.id === id);
        if (!existing) {
          throw new Error('Server not found.');
        }

        existing.type = type;
        existing.name = name;
        existing.baseUrl = baseUrl;
        existing.connectionUrl = connectionUrl;
        existing.enabled = enabled;
        // If apiKey is blank, keep existing.
        if (String(apiKey || '').trim()) {
          existing.apiKey = apiKey;
        }
      } else {
        const newId = `srv_${randomToken(8)}`;
        state.servers.push({
          id: newId,
          type,
          name,
          baseUrl,
          connectionUrl,
          apiKey,
          enabled,
        });
      }

      return state;
    });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('not found')) return new NextResponse('Server not found.', { status: 404 });
    return new NextResponse(msg || 'Failed to save server.', { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
