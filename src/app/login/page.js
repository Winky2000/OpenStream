import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';
import { getRequestOrigin } from '@/lib/request';

export default function LoginPage() {
  const state = readState();
  if (!state.setup?.complete) {
    redirect('/setup');
  }

  const session = getSession();
  if (session?.role === 'admin') redirect('/admin');
  if (session?.role === 'guest') redirect('/signup');

  async function loginAction(formData) {
    'use server';
    const role = String(formData.get('role') || 'guest');
    const password = String(formData.get('password') || '');

    const origin = getRequestOrigin();
    const res = await fetch(`${origin}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Login failed');
    }

    redirect(role === 'admin' ? '/admin' : '/signup');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Login</h1>
      <form className={styles.form} action={loginAction}>
        <label className={styles.label}>
          Role
          <select className={styles.input} name="role" defaultValue="guest">
            <option value="guest">Guest</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <label className={styles.label}>
          Password
          <input className={styles.input} type="password" name="password" required />
        </label>

        <button className={styles.button} type="submit">Login</button>
      </form>
    </div>
  );
}
