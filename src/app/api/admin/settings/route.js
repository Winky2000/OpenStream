import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { updateStateLocked } from '@/lib/store';

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

  const nextSmtp = {
    host: String(smtpIn.host || ''),
    port: Number(smtpIn.port || 587),
    secure: Boolean(smtpIn.secure),
    user: String(smtpIn.user || ''),
    from: String(smtpIn.from || ''),
    // If pass is blank, keep existing.
    pass: String(smtpIn.pass || '') ? String(smtpIn.pass) : String(state.smtp?.pass || ''),
  };
  await updateStateLocked((state) => {
    state.smtp = nextSmtp;
    return state;
  });
  return NextResponse.json({ ok: true });
}
