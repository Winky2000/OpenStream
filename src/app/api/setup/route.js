import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/crypto';
import { readState, writeState } from '@/lib/store';

export async function POST(req) {
  const state = readState();
  if (state.setup?.complete) {
    return new NextResponse('Setup already completed.', { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const adminPassword = String(body.adminPassword || '');
  const guestPassword = String(body.guestPassword || '');

  if (adminPassword.length < 8 || guestPassword.length < 8) {
    return new NextResponse('Passwords must be at least 8 characters.', { status: 400 });
  }

  state.setup = {
    complete: true,
    adminPasswordHash: hashPassword(adminPassword),
    guestPasswordHash: hashPassword(guestPassword),
  };

  try {
    writeState(state);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message || '') : String(e || '');
    console.error('api/setup failed while writing state:', msg);
    return new NextResponse('Setup failed: unable to write state file. Check volume/path permissions.', { status: 500 });
  }
}
