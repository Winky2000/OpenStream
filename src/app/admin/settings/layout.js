import { redirect } from 'next/navigation';
import styles from '../../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';

export default async function AdminSettingsLayout({ children }) {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/signup');

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Admin settings</h1>

      <div className={styles.tabs}>
        <a className={styles.tab} href="/admin/settings/base-url">Base URL</a>
        <a className={styles.tab} href="/admin/settings/smtp">SMTP</a>
        <a className={styles.tab} href="/admin/settings/requests">Requests</a>
        <a className={styles.tab} href="/admin/settings/about">About</a>
        <a className={styles.tab} href="/admin/settings/servers">Servers</a>
        <a className={styles.tab} href="/admin/settings/add-server">Add server</a>
        <a className={styles.tab} href="/admin/settings/libraries">Libraries</a>
        <a className={styles.tab} href="/admin/settings/audit">Audit</a>
      </div>

      {children}

      <p className={styles.p}>
        <a className={styles.a} href="/admin">Back</a>
      </p>
    </div>
  );
}
