import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState, writeState } from '@/lib/store';
import { hashPassword } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export default function SetupPage({ searchParams }) {
  const state = readState();
  if (state.setup?.complete) {
    redirect('/login');
  }

  const errRaw = String(searchParams?.err || '');
  let err = '';
  try {
    err = errRaw ? decodeURIComponent(errRaw) : '';
  } catch {
    err = errRaw;
  }

  async function setupAction(formData) {
    'use server';
    const adminPassword = String(formData.get('adminPassword') || '');
    const guestPassword = String(formData.get('guestPassword') || '');

    if (adminPassword.length < 8 || guestPassword.length < 8) {
      redirect(`/setup?err=${encodeURIComponent('Passwords must be at least 8 characters.')}`);
    }

    const next = readState();
    if (next.setup?.complete) {
      redirect('/login');
    }

    next.setup = {
      complete: true,
      adminPasswordHash: hashPassword(adminPassword),
      guestPasswordHash: hashPassword(guestPassword),
    };

    try {
      writeState(next);
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String(e.message || '') : String(e || '');
      console.error('Setup failed while writing state:', msg);
      redirect(`/setup?err=${encodeURIComponent('Setup failed: unable to write state file. Check volume/path permissions.')}`);
    }

    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>OpenStream setup</h1>
      <p className={styles.p}>Set the admin and guest passwords. You can change settings later in the admin backend.</p>

      {err ? (
        <p className={styles.p}>
          <strong>Setup error:</strong> <span className={styles.muted}>{err}</span>
        </p>
      ) : null}

      <form className={styles.form} action={setupAction}>
        <label className={styles.label}>
          Admin password
          <input className={styles.input} type="password" name="adminPassword" minLength={8} required />
        </label>

        <label className={styles.label}>
          Guest password
          <input className={styles.input} type="password" name="guestPassword" minLength={8} required />
        </label>

        <button className={styles.button} type="submit">Complete setup</button>
      </form>
    </div>
  );
}
