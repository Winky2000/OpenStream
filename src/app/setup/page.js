import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getRequestOrigin } from '@/lib/request';

export default function SetupPage() {
  const state = readState();
  if (state.setup?.complete) {
    redirect('/login');
  }

  async function setupAction(formData) {
    'use server';
    const adminPassword = String(formData.get('adminPassword') || '');
    const guestPassword = String(formData.get('guestPassword') || '');

    const origin = getRequestOrigin();
    const res = await fetch(`${origin}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword, guestPassword }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Setup failed');
    }

    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>OpenStream setup</h1>
      <p className={styles.p}>Set the admin and guest passwords. You can change settings later in the admin backend.</p>

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
