import { NextResponse, type NextRequest } from 'next/server';
import { GATE_COOKIE, gateToken, passcode, same } from '@/lib/gate';

/**
 * The gate (see lib/gate.ts). Open when no passcode is configured, so a local
 * checkout and a fresh deploy both just work.
 */
export async function middleware(req: NextRequest) {
  const secret = passcode();
  if (!secret) return NextResponse.next();

  const cookie = req.cookies.get(GATE_COOKIE)?.value ?? '';
  if (cookie && same(cookie, await gateToken(secret))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the unlock screen itself, the endpoint behind it, and
  // Next's own static assets.
  matcher: ['/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico).*)'],
};
