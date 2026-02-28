import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getRequestOrigin } from '@/lib/request';

export default function SetPasswordPage({ searchParams }) {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const token = String(searchParams?.token || '');
  const done = String(searchParams?.done || '') === '1';

  async function setPasswordAction(formData) {
    'use server';
    const token2 = String(formData.get('token') || '');
    const password = String(formData.get('password') || '');

    const origin = getRequestOrigin();
    const res = await fetch(`${origin}/api/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token2, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to set password');
    }

    redirect('/set-password?done=1');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Set your password</h1>
      <p className={styles.p}>Choose a password to finish creating your account.</p>

      {done ? (
        <p className={styles.p}><strong>Success.</strong> Your account was created. You can now log in to Jellyfin/Emby with your username and password.</p>
      ) : null}

      {done ? null : (
        <form className={styles.form} action={setPasswordAction}>
          <input type="hidden" name="token" value={token} />
          <label className={styles.label}>
            Password
            <input className={styles.input} type="password" name="password" minLength={8} required />
          </label>
          <button className={styles.button} type="submit">Create my account</button>
        </form>
      )}
    </div>
  );
}
