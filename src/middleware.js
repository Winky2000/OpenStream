import { NextResponse } from 'next/server';

// Break redirect loops caused by legacy path-scoped session cookies.
// Some older builds/browsers may have stored the session cookie with the default
// path (e.g. Path=/login), which makes it visible on /login but not on /signup
// or /admin, causing infinite redirects.
export function middleware(req) {
  const res = NextResponse.next();

  const proto = String(req.headers.get('x-forwarded-proto') || '').toLowerCase();
  const secure = proto === 'https';

  // Clear both current and legacy cookie names for the /login path only.
  // Do NOT clear Path=/ cookies.
  for (const name of ['openstream_session', 'openstream_session_v2']) {
    res.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/login',
      maxAge: 0,
    });
  }

  return res;
}

export const config = {
  matcher: ['/login/:path*'],
};
