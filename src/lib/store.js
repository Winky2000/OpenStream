import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATA_PATH = path.join(process.cwd(), 'data', 'openstream.json');
const MAX_AUDIT_EVENTS = 500;
const MAX_BACKUPS = 5;

function dataPath() {
  return process.env.OPENSTREAM_DATA_PATH
    ? path.resolve(process.env.OPENSTREAM_DATA_PATH)
    : DEFAULT_DATA_PATH;
}

export function getResolvedDataPath() {
  return dataPath();
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

const DEFAULT_STATE = {
  setup: {
    complete: false,
    adminPasswordHash: '',
    guestPasswordHash: '',
  },
  // Optional: override the base URL used for invite links.
  // If blank, OpenStream will use OPENSTREAM_PUBLIC_BASE_URL or the request origin.
  publicBaseUrl: '',
  // Append-only audit log for troubleshooting.
  // Stored in the same JSON file; rotated backups keep older history.
  events: [],
  // Optional Requests app (Jellyseerr/Overseerr) link shown during signup.
  seerr: {
    url: '',
    apiKey: '',
    // When true, OpenStream will attempt to set a Seerr local-user password during provisioning.
    // When false, the Seerr user will be created without a password so Seerr can email a set-password link.
    setLocalPassword: true,
  },
  // Optional About info shown during signup.
  about: {
    text: '',
  },
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  },
  // Array of { id, type: 'jellyfin'|'emby', name, baseUrl, connectionUrl, apiKey, enabled, libraries, offeredLibraryIds }
  servers: [],
  signups: [],
};

function normalizeServers(servers) {
  // New format: array of server entries.
  if (Array.isArray(servers)) {
    return servers
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        id: String(s.id || ''),
        type: String(s.type || ''),
        name: String(s.name || ''),
        baseUrl: String(s.baseUrl || ''),
        connectionUrl: String(s.connectionUrl || ''),
        apiKey: String(s.apiKey || ''),
        enabled: Boolean(s.enabled),
        libraries: Array.isArray(s.libraries)
          ? s.libraries
              .filter((l) => l && typeof l === 'object')
              .map((l) => ({ id: String(l.id || ''), name: String(l.name || '') }))
              .filter((l) => l.id && l.name)
          : [],
        offeredLibraryIds: Array.isArray(s.offeredLibraryIds)
          ? s.offeredLibraryIds.map((x) => String(x)).filter(Boolean)
          : null,
      }))
      .filter((s) => s.id && (s.type === 'jellyfin' || s.type === 'emby'));
  }

  // Old format: { jellyfin: {baseUrl, apiKey}, emby: {baseUrl, apiKey} }
  if (servers && typeof servers === 'object') {
    const jellyfin = servers.jellyfin && typeof servers.jellyfin === 'object' ? servers.jellyfin : {};
    const emby = servers.emby && typeof servers.emby === 'object' ? servers.emby : {};

    const legacy = [];
    if (jellyfin.baseUrl || jellyfin.apiKey) {
      legacy.push({
        id: 'jellyfin-1',
        type: 'jellyfin',
        name: 'Jellyfin',
        baseUrl: String(jellyfin.baseUrl || ''),
        connectionUrl: String(jellyfin.baseUrl || ''),
        apiKey: String(jellyfin.apiKey || ''),
        enabled: Boolean(jellyfin.baseUrl && jellyfin.apiKey),
      });
    }
    if (emby.baseUrl || emby.apiKey) {
      legacy.push({
        id: 'emby-1',
        type: 'emby',
        name: 'Emby',
        baseUrl: String(emby.baseUrl || ''),
        connectionUrl: String(emby.baseUrl || ''),
        apiKey: String(emby.apiKey || ''),
        enabled: Boolean(emby.baseUrl && emby.apiKey),
      });
    }
    return legacy;
  }

  return [];
}

function normalizeState(state) {
  const out = {
    ...structuredClone(DEFAULT_STATE),
    ...(state && typeof state === 'object' ? state : {}),
  };

  out.publicBaseUrl = String(out.publicBaseUrl || '').trim().replace(/\/+$/, '');

  if (!Array.isArray(out.events)) out.events = [];
  out.events = out.events
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      id: String(e.id || ''),
      at: Number(e.at || 0) || 0,
      type: String(e.type || ''),
      actor: String(e.actor || ''),
      message: String(e.message || ''),
      meta: e.meta && typeof e.meta === 'object' ? e.meta : null,
    }))
    .filter((e) => e.at && e.type)
    .slice(-MAX_AUDIT_EVENTS);

  out.servers = normalizeServers(out.servers);
  if (typeof out.seerr === 'string') {
    out.seerr = {
      url: String(out.seerr || '').trim().replace(/\/+$/, ''),
      apiKey: '',
      setLocalPassword: true,
    };
  } else if (!out.seerr || typeof out.seerr !== 'object') {
    out.seerr = structuredClone(DEFAULT_STATE.seerr);
  } else {
    out.seerr = {
      url: String(out.seerr.url || '').trim().replace(/\/+$/, ''),
      apiKey: String(out.seerr.apiKey || ''),
      setLocalPassword: out.seerr.setLocalPassword == null ? true : Boolean(out.seerr.setLocalPassword),
    };
  }

  if (typeof out.about === 'string') {
    out.about = { text: String(out.about || '').trim() };
  } else if (!out.about || typeof out.about !== 'object') {
    out.about = structuredClone(DEFAULT_STATE.about);
  } else {
    out.about = {
      text: String(out.about.text || '').trim(),
    };
  }
  if (!Array.isArray(out.signups)) out.signups = [];
  out.signups = out.signups
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const seerrImport = s.seerrImport && typeof s.seerrImport === 'object' ? s.seerrImport : null;
      const status = String(s.status || '');
      const provisionedAt = Number(s.provisionedAt || 0) || 0;
      const tokenUsedAtRaw = s.tokenUsedAt == null ? null : Number(s.tokenUsedAt || 0) || 0;

      // Back-compat: older builds marked tokenUsedAt before provisioning.
      // If provisioning failed and there's no provisionedAt, keep token reusable.
      const tokenUsedAt = status === 'provision_failed' && tokenUsedAtRaw && !provisionedAt ? null : tokenUsedAtRaw;

      const provisioningStartedAt = Number(s.provisioningStartedAt || 0) || 0;
      return {
        ...s,
        tokenUsedAt,
        provisioningStartedAt,
        seerrImport: seerrImport
          ? {
              attempted: Boolean(seerrImport.attempted),
              ok: Boolean(seerrImport.ok),
              skippedReason: String(seerrImport.skippedReason || ''),
              error: String(seerrImport.error || ''),
              at: Number(seerrImport.at || 0) || 0,
            }
          : null,
      };
    });
  return out;
}

function readTextFileIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function readState() {
  const p = dataPath();
  const candidates = [p];
  for (let i = 1; i <= MAX_BACKUPS; i += 1) {
    candidates.push(`${p}.bak${i}`);
  }

  for (const candidate of candidates) {
    const raw = readTextFileIfExists(candidate);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch {
      // Try next candidate (backup)
    }
  }

  return structuredClone(DEFAULT_STATE);
}

function writeFileAtomic(filePath, content) {
  ensureDir(filePath);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');

  // Rotate backups of the previous state file (best-effort).
  try {
    if (fs.existsSync(filePath)) {
      for (let i = MAX_BACKUPS; i >= 1; i -= 1) {
        const dst = `${filePath}.bak${i}`;
        const src = i === 1 ? filePath : `${filePath}.bak${i - 1}`;
        try {
          if (fs.existsSync(dst)) fs.rmSync(dst, { force: true });
        } catch {
          // ignore
        }
        try {
          if (fs.existsSync(src)) fs.renameSync(src, dst);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  } catch {
    // ignore
  }

  fs.renameSync(tmp, filePath);
}

export function writeState(state) {
  const p = dataPath();
  writeFileAtomic(p, JSON.stringify(state, null, 2));
}

export function updateState(mutator) {
  const state = readState();
  const next = mutator(state) || state;
  writeState(next);
  return next;
}

export function addAuditEvent(state, { type, actor, message, meta }) {
  const event = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    type: String(type || '').trim(),
    actor: String(actor || '').trim(),
    message: String(message || '').trim(),
    meta: meta && typeof meta === 'object' ? meta : null,
  };

  state.events = Array.isArray(state.events) ? state.events : [];
  state.events.push(event);
  if (state.events.length > MAX_AUDIT_EVENTS) {
    state.events = state.events.slice(-MAX_AUDIT_EVENTS);
  }
  return event;
}

// In-process mutex to avoid lost updates from overlapping requests.
// Note: this does not coordinate across multiple Node processes.
let updateQueue = Promise.resolve();

export async function updateStateLocked(mutator) {
  let release;
  const prev = updateQueue;
  updateQueue = new Promise((r) => {
    release = r;
  });

  await prev;
  try {
    const state = readState();
    const next = mutator(state) || state;
    writeState(next);
    return next;
  } finally {
    release();
  }
}

export function getPublicBaseUrl() {
  const raw = String(process.env.OPENSTREAM_PUBLIC_BASE_URL || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/\/+$/, '')}`;
}
