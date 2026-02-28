import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';
import { getRequestOrigin } from '@/lib/request';

export default function SignupPage({ searchParams }) {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = getSession();
  if (!session) redirect('/login');

  async function signupAction(formData) {
    'use server';
    const username = String(formData.get('username') || '');
    const email = String(formData.get('email') || '');
    const serverType = String(formData.get('serverType') || 'jellyfin');

    const origin = getRequestOrigin();
    const res = await fetch(`${origin}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, serverType }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Signup failed');
    }

    redirect('/signup?sent=1');
  }

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <h1 className={styles.h1}>Request access</h1>
        <form action={async () => {
          'use server';
          const origin = getRequestOrigin();
          await fetch(`${origin}/api/logout`, { method: 'POST' });
          redirect('/login');
        }}>
          <button className={styles.linkButton} type="submit">Logout</button>
        </form>
      </div>

      <p className={styles.p}>Enter a username and email. We’ll email you a unique link to finish creating your account.</p>
      {String(searchParams?.sent || '') === '1' ? (
        <p className={styles.p}><strong>Sent.</strong> Check your email for the link.</p>
      ) : null}

      <form className={styles.form} action={signupAction}>
        <label className={styles.label}>
          Username
          <input className={styles.input} name="username" autoComplete="username" required />
        </label>

        <label className={styles.label}>
          Email
          <input className={styles.input} type="email" name="email" autoComplete="email" required />
        </label>

        <label className={styles.label}>
          Server
          <select className={styles.input} name="serverType" defaultValue="jellyfin">
            <option value="jellyfin">Jellyfin</option>
            <option value="emby">Emby</option>
          </select>
        </label>

        <button className={styles.button} type="submit">Send me the link</button>
      </form>

      <p className={styles.p}><a className={styles.a} href="/guide">Step-by-step guide</a></p>
    </div>
  );
}
