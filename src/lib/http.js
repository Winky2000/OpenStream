export function getRequestProto(req) {
  // Prefer Origin when available (fetch/XHR, many form POSTs).
  const origin = req?.headers?.get?.('origin') || '';
  if (origin) {
    try {
      return new URL(origin).protocol.replace(':', '');
    } catch {
      // ignore
    }
  }

  // NextRequest provides nextUrl in middleware/route handlers.
  const nextUrlProto = req?.nextUrl?.protocol || '';
  if (nextUrlProto) return String(nextUrlProto).replace(':', '');

  // Proxy header fallback.
  const xfProto = req?.headers?.get?.('x-forwarded-proto') || '';
  if (xfProto) return String(xfProto).toLowerCase();

  // Last resort: parse req.url.
  const url = req?.url || '';
  if (url) {
    try {
      return new URL(url).protocol.replace(':', '');
    } catch {
      // ignore
    }
  }

  return '';
}

export function shouldUseSecureCookies(req) {
  return getRequestProto(req) === 'https';
}
