import { headers } from 'next/headers';

export function getRequestOrigin() {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'http';
  if (!host) return '';
  return `${proto}://${host}`;
}
