import { redirect } from 'next/navigation';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';

export default function GuidePage() {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = getSession();
  if (!session) redirect('/login');

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>How it works</h1>
      <ol className={styles.ol}>
        <li>Log in as Guest.</li>
        <li>Go to the signup page and submit your username + email.</li>
        <li>Check your email for a unique link from OpenStream.</li>
        <li>Open the link and set your password.</li>
        <li>Log in to Jellyfin/Emby with the username + password you chose.</li>
      </ol>
      <p className={styles.p}><a className={styles.a} href="/signup">Back to signup</a></p>
    </div>
  );
}
