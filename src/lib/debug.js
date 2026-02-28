export function debugEndpointsEnabled() {
  const raw = String(process.env.OPENSTREAM_DEBUG_ENDPOINTS || '')
    .trim()
    .toLowerCase();

  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;

  // In dev/test, keep debug endpoints available by default.
  return process.env.NODE_ENV !== 'production';
}
