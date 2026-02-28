import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession, setSession } from '@/lib/session';
import { verifyPassword } from '@/lib/crypto';

export default async function LoginPage() {
  const state = readState();
  if (!state.setup?.complete) {
    redirect('/setup');
  }

  const session = await getSession();
  if (session?.role === 'admin') redirect('/admin');
  if (session?.role === 'guest') redirect('/signup');

  async function loginAction(formData) {
    'use server';
    const password = String(formData.get('password') || '');

    const state2 = readState();
    const adminHash = String(state2.setup?.adminPasswordHash || '');
    const guestHash = String(state2.setup?.guestPasswordHash || '');

    let role = '';
    if (adminHash && verifyPassword(password, adminHash)) {
      role = 'admin';
    } else if (guestHash && verifyPassword(password, guestHash)) {
      role = 'guest';
    } else {
      throw new Error('Invalid password.');
    }

    await setSession(role);
    redirect(role === 'admin' ? '/admin' : '/signup');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Login</h1>
      <form className={styles.form} action={loginAction}>
        <label className={styles.label}>
          Password
          <input className={styles.input} type="password" name="password" required />
        </label>

        <button className={styles.button} type="submit">Login</button>
      </form>
    </div>
  );
}
