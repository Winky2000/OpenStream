import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readState, writeState } from '@/lib/store';

export async function POST(req) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Unauthorized.', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const state = readState();

  const smtpIn = body.smtp || {};
  const serversIn = body.servers || {};

  const nextSmtp = {
    host: String(smtpIn.host || ''),
    port: Number(smtpIn.port || 587),
    secure: Boolean(smtpIn.secure),
    user: String(smtpIn.user || ''),
    from: String(smtpIn.from || ''),
    // If pass is blank, keep existing.
    pass: String(smtpIn.pass || '') ? String(smtpIn.pass) : String(state.smtp?.pass || ''),
  };

  const jellyfinIn = serversIn.jellyfin || {};
  const embyIn = serversIn.emby || {};

  state.smtp = nextSmtp;
  state.servers = {
    jellyfin: {
      baseUrl: String(jellyfinIn.baseUrl || ''),
      apiKey: String(jellyfinIn.apiKey || ''),
    },
    emby: {
      baseUrl: String(embyIn.baseUrl || ''),
      apiKey: String(embyIn.apiKey || ''),
    },
  };

  writeState(state);
  return NextResponse.json({ ok: true });
}
