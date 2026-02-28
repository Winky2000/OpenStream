import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { updateStateLocked } from '@/lib/store';

function normalizePort(value, fallback = 587) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < 1 || i > 65535) return fallback;
  return i;
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

  const smtpIn = body.smtp || {};

  await updateStateLocked((state) => {
    const prevPass = String(state.smtp?.pass || '');
    const nextPass = String(smtpIn.pass || '');
    state.smtp = {
      host: String(smtpIn.host || ''),
      port: normalizePort(smtpIn.port, 587),
      secure: Boolean(smtpIn.secure),
      user: String(smtpIn.user || ''),
      from: String(smtpIn.from || ''),
      // If pass is blank, keep existing.
      pass: nextPass.trim() ? nextPass : prevPass,
    };
    return state;
  });
  return NextResponse.json({ ok: true });
}
