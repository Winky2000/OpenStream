import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { saveSeerrAction } from '../actions';

export default async function RequestsSettingsPage() {
  const state = readState();
  const seerr = state.seerr || {};

  return (
    <div className={styles.block}>
      <form className={styles.form} action={saveSeerrAction}>
        <h2 className={styles.h2}>Requests (Jellyseerr/Overseerr)</h2>
        <p className={styles.p}>Optional: set a public URL for your Requests app so guests can request movies/shows during signup.</p>
        <label className={styles.label}>
          Requests URL
          <input
            className={styles.input}
            name="seerrUrl"
            placeholder="https://requests.example.com"
            defaultValue={seerr.url || ''}
          />
        </label>
        <label className={styles.label}>
          API Key (optional; leave blank to keep existing)
          <input
            className={styles.input}
            name="seerrApiKey"
            type="password"
            placeholder={seerr.apiKey ? '(saved — leave blank to keep)' : 'paste Seerr API key'}
            autoComplete="new-password"
          />
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="seerrSetLocalPassword"
            defaultChecked={seerr.setLocalPassword !== false}
          />
          Set Seerr local password during provisioning
        </label>
        <p className={styles.p}>
          If unchecked, Seerr will create the user without a password and email them a set-password link.
        </p>
        <button className={styles.button} type="submit">Save</button>
      </form>
    </div>
  );
}
