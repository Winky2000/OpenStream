import { NextResponse } from 'next/server';
import { shouldUseSecureCookies } from '@/lib/http';

// Break redirect loops caused by legacy path-scoped session cookies.
// Some older builds/browsers may have stored the session cookie with the default
// path (e.g. Path=/login), which makes it visible on /login but not on /signup
// or /admin, causing infinite redirects.
export function middleware(req) {
  const res = NextResponse.next();

  const secure = shouldUseSecureCookies(req);

  // Help prevent reverse proxies from caching session-dependent pages.
  // (Some setups can otherwise serve a cached redirect-to-/login.)
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.append('Vary', 'Cookie');

  const pathname = req.nextUrl?.pathname || '';

  // Safety net: if an invite link accidentally lands on /login with a token
  // (e.g., due to a reverse proxy rewrite), send it to the set-password page.
  // This keeps invite links working even when the base URL is misconfigured.
  if (pathname.startsWith('/login')) {
    const token = req.nextUrl?.searchParams?.get('token') || '';
    if (token) {
      const dest = new URL('/set-password', req.url);
      dest.searchParams.set('token', token);
      return NextResponse.redirect(dest, 302);
    }
  }

  // Only clear legacy /login-scoped cookies on /login.
  if (!pathname.startsWith('/login')) {
    return res;
  }

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
  // Apply no-store + Vary: Cookie across user-facing pages.
  // Exclude /api and Next static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
