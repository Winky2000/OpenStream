import { NextResponse } from 'next/server';
import { readState } from '@/lib/store';
import { verifyPassword } from '@/lib/crypto';
import { setSession } from '@/lib/session';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const role = String(body.role || 'guest');
  const password = String(body.password || '');

  if (role !== 'admin' && role !== 'guest') {
    return new NextResponse('Invalid role.', { status: 400 });
  }

  const state = readState();
  if (!state.setup?.complete) {
    return new NextResponse('Setup not completed.', { status: 400 });
  }

  const hash = role === 'admin' ? state.setup.adminPasswordHash : state.setup.guestPasswordHash;
  if (!verifyPassword(password, hash)) {
    return new NextResponse('Invalid password.', { status: 401 });
  }

  setSession(role);
  return NextResponse.json({ ok: true });
}
