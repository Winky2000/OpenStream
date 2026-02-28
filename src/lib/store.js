import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATA_PATH = path.join(process.cwd(), 'data', 'openstream.json');

function dataPath() {
  return process.env.OPENSTREAM_DATA_PATH
    ? path.resolve(process.env.OPENSTREAM_DATA_PATH)
    : DEFAULT_DATA_PATH;
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
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
  },
  servers: {
    jellyfin: { baseUrl: '', apiKey: '' },
    emby: { baseUrl: '', apiKey: '' },
  },
  signups: [],
};

function readRaw() {
  const p = dataPath();
  try {
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

export function readState() {
  const raw = readRaw();
  if (!raw) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function writeFileAtomic(filePath, content) {
  ensureDir(filePath);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
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

export function getPublicBaseUrl() {
  const raw = String(process.env.OPENSTREAM_PUBLIC_BASE_URL || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  return `https://${raw.replace(/\/+$/, '')}`;
}
