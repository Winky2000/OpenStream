import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession, setSession } from '@/lib/session';
import { verifyPassword } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }) {
  const sp = await Promise.resolve(searchParams);
  const errorKey = String(sp?.error || '');

  const state = readState();
  if (!state.setup?.complete) {
    return (
      <div className={styles.container}>
        <h1 className={styles.h1}>Setup required</h1>
        <p className={styles.p}>OpenStream hasn’t been set up yet.</p>
        <p className={styles.p}>
          <a className={styles.a} href="/setup">Go to setup</a>
        </p>
      </div>
    );
  }

  const session = await getSession();
  if (session?.role === 'admin') redirect('/admin');
  if (session?.role === 'guest') redirect('/signup');

  async function loginAction(formData) {
    'use server';
    try {
      const password = String(formData.get('password') || '');

      const state2 = readState();
      if (!state2.setup?.complete) redirect('/setup');

      const adminHash = String(state2.setup?.adminPasswordHash || '');
      const guestHash = String(state2.setup?.guestPasswordHash || '');

      let role = '';
      if (adminHash && verifyPassword(password, adminHash)) {
        role = 'admin';
      } else if (guestHash && verifyPassword(password, guestHash)) {
        role = 'guest';
      } else {
        redirect('/login?error=invalid');
      }

      await setSession(role);
      redirect(role === 'admin' ? '/admin' : '/signup');
    } catch (e) {
      console.error('[OpenStream] loginAction failed', e);
      redirect('/login?error=unexpected');
    }
  }

  const errorMessage =
    errorKey === 'invalid'
      ? 'Invalid password.'
      : errorKey === 'unexpected'
        ? 'Login failed. Please try again.'
        : '';

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Login</h1>

      {errorMessage ? (
        <div className={styles.block} role="alert">
          <p className={styles.p} style={{ margin: 0 }}>
            <strong>{errorMessage}</strong>
          </p>
        </div>
      ) : null}

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
