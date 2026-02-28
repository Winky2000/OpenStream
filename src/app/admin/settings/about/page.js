import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { saveAboutAction } from '../actions';

export default async function AboutSettingsPage() {
  const state = readState();
  const about = state.about || {};

  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>About</h2>
      <p className={styles.p}>This text will appear as Step 6 on the signup page.</p>

      <form className={styles.form} action={saveAboutAction}>
        <label className={styles.label}>
          About text
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            name="aboutText"
            defaultValue={about.text || ''}
            placeholder="Optional: add notes about the server, rules, contact info, or how requests work."
          />
        </label>

        <button className={styles.button} type="submit">Save About</button>
      </form>
    </div>
  );
}
