import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';
import LoginFormClient from './LoginFormClient';

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
  if (session?.role === 'admin' || session?.role === 'guest') {
    const dest = session.role === 'admin' ? '/admin' : '/signup';
    return (
      <div className={styles.container}>
        <h1 className={styles.h1}>You’re already logged in</h1>
        <p className={styles.p}>
          Continue to <a className={styles.a} href={dest}>{dest}</a>.
        </p>
        <p className={styles.p}>
          If you need to log in with a different password, log out first.
        </p>

        <form method="post" action="/api/logout-form">
          <button className={styles.linkButton} type="submit">Logout</button>
        </form>
      </div>
    );
  }

  const errorMessage =
    errorKey === 'invalid'
      ? 'Invalid password.'
      : errorKey === 'rate'
        ? 'Too many attempts. Please wait and try again.'
      : errorKey === 'unexpected'
        ? 'Login failed. Please try again.'
        : '';

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Login</h1>

      <LoginFormClient initialErrorKey={errorKey} />
    </div>
  );
}
