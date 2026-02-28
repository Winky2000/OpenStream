'use client';

import { useMemo, useState } from 'react';
import styles from '@/app/ui.module.css';

export default function ServerLibraryPicker({ servers }) {
  const normalizedServers = useMemo(() => (Array.isArray(servers) ? servers : []), [servers]);

  const serverMap = useMemo(() => {
    const map = new Map();
    for (const s of normalizedServers) {
      if (!s?.id) continue;
      map.set(String(s.id), {
        id: String(s.id),
        label: `${s.name} (${s.type})`,
        libraries: Array.isArray(s.libraries) ? s.libraries : [],
      });
    }
    return map;
  }, [normalizedServers]);

  const initialServerId = normalizedServers[0]?.id ? String(normalizedServers[0].id) : '';
  const initialLibraries = normalizedServers[0]?.libraries || [];
  const [serverId, setServerId] = useState(() => initialServerId);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set((Array.isArray(initialLibraries) ? initialLibraries : []).map((l) => String(l.id))),
  );

  const libraries = serverMap.get(serverId)?.libraries || [];

  const toggle = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleServerChange = (nextServerId) => {
    const nextId = String(nextServerId || '');
    setServerId(nextId);
    const nextLibraries = serverMap.get(nextId)?.libraries || [];
    setSelectedIds(new Set((nextLibraries || []).map((l) => String(l.id))));
  };

  const disabled = normalizedServers.length === 0;

  return (
    <>
      <label className={styles.label}>
        Server
        <select
          className={styles.input}
          name="serverId"
          required
          value={serverId}
          onChange={(e) => handleServerChange(e.target.value)}
          disabled={disabled}
        >
          {normalizedServers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.type})
            </option>
          ))}
        </select>
      </label>

      {libraries.length > 0 ? (
        <div className={styles.label}>
          Libraries
          <div>
            {libraries.map((l) => (
              <label key={l.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="requestedLibraryId"
                  value={l.id}
                  checked={selectedIds.has(String(l.id))}
                  onChange={() => toggle(l.id)}
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.p}>
          <em>No libraries are configured for this server yet.</em>
        </p>
      )}
    </>
  );
}
