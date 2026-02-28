import { redirect } from 'next/navigation';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';

export default function Home() {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = getSession();
  if (!session) redirect('/login');

  redirect(session.role === 'admin' ? '/admin' : '/signup');
}
