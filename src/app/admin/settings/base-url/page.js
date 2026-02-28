import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { savePublicBaseUrlAction } from '../actions';

export default async function BaseUrlSettingsPage() {
  const state = readState();
  const publicBaseUrl = String(state.publicBaseUrl || '').trim();

  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>Public Base URL</h2>
      <p className={styles.p}>
        Optional but recommended behind a reverse proxy. This is used to generate invite links in emails.
      </p>
      <form className={styles.form} action={savePublicBaseUrlAction}>
        <label className={styles.label}>
          Public Base URL
          <input
            className={styles.input}
            name="publicBaseUrl"
            placeholder="https://openstream.example.com"
            defaultValue={publicBaseUrl}
          />
        </label>
        <button className={styles.button} type="submit">Save</button>
      </form>
    </div>
  );
}
