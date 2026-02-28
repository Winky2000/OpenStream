const buckets = new Map();

function nowMs() {
  return Date.now();
}

function getClientIp(req) {
  try {
    const xff = req.headers.get('x-forwarded-for') || '';
    if (xff) return String(xff.split(',')[0]).trim();
    const realIp = req.headers.get('x-real-ip') || '';
    if (realIp) return String(realIp).trim();
  } catch {
    // ignore
  }
  return 'unknown';
}

export function rateLimit(req, { keyPrefix, limit, windowMs }) {
  const ip = getClientIp(req);
  const key = `${String(keyPrefix || 'rl')}:${ip}`;
  const t = nowMs();

  const existing = buckets.get(key);
  if (!existing || (t - existing.startMs) >= windowMs) {
    const entry = { startMs: t, count: 1 };
    buckets.set(key, entry);
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  if (existing.count <= limit) {
    return { ok: true, remaining, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (t - existing.startMs)) / 1000));
  return { ok: false, remaining: 0, retryAfterSeconds };
}

// Best-effort cleanup to avoid unbounded growth in long-running processes.
export function pruneRateLimitBuckets({ maxAgeMs }) {
  const t = nowMs();
  for (const [key, value] of buckets.entries()) {
    if (!value || typeof value !== 'object') {
      buckets.delete(key);
      continue;
    }
    if ((t - Number(value.startMs || 0)) > maxAgeMs) {
      buckets.delete(key);
    }
  }
}
