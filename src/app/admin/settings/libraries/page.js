import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { syncLibrariesAction, saveOfferedLibrariesAction } from '../actions';

export default async function LibrariesSettingsPage() {
  const state = readState();
  const servers = Array.isArray(state.servers) ? state.servers : [];

  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>Libraries</h2>
      <p className={styles.p}>Sync libraries from each server, then choose which libraries you want to offer during signup.</p>

      {servers.length === 0 ? (
        <p className={styles.p}><em>No servers configured yet.</em></p>
      ) : (
        servers.map((s) => (
          <details key={`libs-${s.id}`} className={styles.stepDetails}>
            <summary className={styles.stepSummary}>
              {s.name} ({s.type}) libraries
            </summary>
            <div className={styles.stepBody}>
              <div className={styles.stepInner}>
                <form className={styles.form} action={syncLibrariesAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={styles.smallButton} type="submit">Sync from server</button>
                </form>

                {(Array.isArray(s.libraries) ? s.libraries : []).length === 0 ? (
                  <p className={styles.p}><em>No libraries synced yet.</em></p>
                ) : (
                  <form className={styles.form} action={saveOfferedLibrariesAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <p className={styles.p}><strong>Offer these libraries</strong></p>
                    {(Array.isArray(s.libraries) ? s.libraries : []).map((l) => (
                      <label key={l.id} className={styles.checkbox}>
                        <input
                          type="checkbox"
                          name="offeredLibraryId"
                          value={l.id}
                          defaultChecked={
                            Array.isArray(s.offeredLibraryIds)
                              ? s.offeredLibraryIds.includes(l.id)
                              : true
                          }
                        />
                        {l.name}
                      </label>
                    ))}
                    <button className={styles.smallButton} type="submit">Save offered libraries</button>
                  </form>
                )}
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
