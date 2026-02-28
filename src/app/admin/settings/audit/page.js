import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';

export default async function AuditSettingsPage({ searchParams }) {
  const state = readState();
  const events = Array.isArray(state.events) ? state.events.slice().reverse() : [];

  const auditType = String(searchParams?.auditType || '').trim();
  const eventTypes = Array.from(new Set(events.map((e) => String(e?.type || '')).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
  const shownEvents = auditType ? events.filter((e) => String(e?.type || '') === auditType) : events;

  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>Audit</h2>
      <p className={styles.p}>Recent events (newest first). This is stored in the state file.</p>

      <form className={styles.form} action="/admin/settings/audit" method="get">
        <label className={styles.label}>
          Type filter
          <select className={styles.input} name="auditType" defaultValue={auditType}>
            <option value="">All</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <button className={styles.smallButton} type="submit">Filter</button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Signup</th>
              <th>Actor</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {shownEvents.length === 0 ? (
              <tr><td colSpan={5}>No events yet.</td></tr>
            ) : (
              shownEvents.slice(0, 150).map((e) => (
                <tr key={e.id || `${e.at}-${e.type}`}>
                  <td>{e.at ? new Date(e.at).toLocaleString() : ''}</td>
                  <td>{e.type}</td>
                  <td>{e?.meta && typeof e.meta === 'object' && e.meta.signupId ? String(e.meta.signupId) : ''}</td>
                  <td>{e.actor || ''}</td>
                  <td className={styles.preWrap}>{e.message || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
