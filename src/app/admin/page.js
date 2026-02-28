import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';
import { getRequestOrigin } from '@/lib/request';

export default function AdminPage() {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/signup');

  const signups = Array.isArray(state.signups) ? state.signups.slice().reverse() : [];

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <h1 className={styles.h1}>Admin</h1>
        <div className={styles.row}>
          <a className={styles.a} href="/admin/settings">Settings</a>
          <form action={async () => {
            'use server';
            const origin = getRequestOrigin();
            await fetch(`${origin}/api/logout`, { method: 'POST' });
            redirect('/login');
          }}>
            <button className={styles.linkButton} type="submit">Logout</button>
          </form>
        </div>
      </div>

      <h2 className={styles.h2}>Signups</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Server</th>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 ? (
              <tr><td colSpan={6}>No signups yet.</td></tr>
            ) : signups.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.serverType}</td>
                <td>{s.username}</td>
                <td>{s.email}</td>
                <td>{s.status}</td>
                <td>{s.error || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
