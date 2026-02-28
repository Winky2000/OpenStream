import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { upsertServerAction } from '../actions';

export default async function ServersSettingsPage() {
  const state = readState();
  const servers = Array.isArray(state.servers) ? state.servers : [];

  return (
    <div className={styles.block}>
      <h2 className={styles.h2}>Servers</h2>
      <p className={styles.p}>
        Add one or more Jellyfin/Emby servers. “Connection URL” is the public/reverse-proxied URL users should connect to (optional; defaults to Base URL).
      </p>

      {servers.length === 0 ? (
        <p className={styles.p}><em>No servers configured yet.</em></p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Type</th>
                <th>Name</th>
                <th>Base URL</th>
                <th>Connection URL</th>
                <th>API key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <input
                      form={`server-${s.id}`}
                      name="enabled"
                      type="checkbox"
                      defaultChecked={Boolean(s.enabled)}
                    />
                  </td>
                  <td>
                    <select form={`server-${s.id}`} className={styles.input} name="type" defaultValue={s.type}>
                      <option value="jellyfin">Jellyfin</option>
                      <option value="emby">Emby</option>
                    </select>
                  </td>
                  <td>
                    <input form={`server-${s.id}`} className={styles.input} name="name" defaultValue={s.name} />
                  </td>
                  <td>
                    <input form={`server-${s.id}`} className={styles.input} name="baseUrl" defaultValue={s.baseUrl} />
                  </td>
                  <td>
                    <input
                      form={`server-${s.id}`}
                      className={styles.input}
                      name="connectionUrl"
                      defaultValue={s.connectionUrl || ''}
                      placeholder={s.baseUrl}
                    />
                  </td>
                  <td>
                    <input
                      form={`server-${s.id}`}
                      className={styles.input}
                      name="apiKey"
                      type="password"
                      placeholder="(leave blank to keep)"
                    />
                  </td>
                  <td>
                    <form id={`server-${s.id}`} action={upsertServerAction} />
                    <input form={`server-${s.id}`} type="hidden" name="id" value={s.id} />
                    <button form={`server-${s.id}`} className={styles.smallButton} type="submit">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
