import { NextResponse, type NextRequest } from 'next/server';
import { GATE_COOKIE, gateToken, passcode, same } from '@/lib/gate';

/**
 * The gate (see lib/gate.ts). Open when no passcode is configured, so a local
 * checkout and a fresh deploy both just work.
 */
/**
 * What anybody may see without the code.
 *
 * The trap this exists to avoid: the matcher below excludes Next's own static
 * assets but NOT arbitrary files in `public/`. A video dropped in there is
 * behind the login wall, which is only ever discovered by somebody outside the
 * building clicking a link and being asked for a passcode nobody gave them.
 *
 * Deliberately narrow. The page, the file it rewrites to, the media it points
 * at, and the icons — nothing else.
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === '/about' ||
    pathname === '/about.html' ||
    pathname.startsWith('/media/') ||
    pathname === '/icon.svg' ||
    pathname === '/apple-icon.svg'
  );
}

export async function middleware(req: NextRequest) {
  if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

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
