import { redirect } from 'next/navigation';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';

export default async function Home() {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = await getSession();
  if (!session) redirect('/login');

  redirect(session.role === 'admin' ? '/admin' : '/signup');
}
