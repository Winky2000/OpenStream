import styles from '../../../ui.module.css';
import { upsertServerAction } from '../actions';

export default async function AddServerSettingsPage() {
  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>Add server</h2>
      <form className={styles.form} action={upsertServerAction}>
        <label className={styles.label}>
          Type
          <select className={styles.input} name="type" defaultValue="jellyfin">
            <option value="jellyfin">Jellyfin</option>
            <option value="emby">Emby</option>
          </select>
        </label>
        <label className={styles.label}>Name<input className={styles.input} name="name" placeholder="Living room" required /></label>
        <label className={styles.label}>Base URL<input className={styles.input} name="baseUrl" placeholder="https://server.example.com" required /></label>
        <label className={styles.label}>Connection URL (optional)<input className={styles.input} name="connectionUrl" placeholder="https://media.example.com" /></label>
        <label className={styles.label}>Admin API key<input className={styles.input} name="apiKey" type="password" required /></label>
        <label className={styles.checkbox}><input type="checkbox" name="enabled" defaultChecked /> Enabled</label>
        <button className={styles.button} type="submit">Add</button>
      </form>
    </div>
  );
}
