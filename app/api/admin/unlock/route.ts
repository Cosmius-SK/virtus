import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasscode, adminToken } from '@/lib/admin/gate';

/**
 * Exchanging the admin code for a cookie.
 *
 * Its own endpoint rather than a field on the settings route, because the
 * settings route is the one an MCP plugin will call and it should stay about
 * settings. Same reason the app's own unlock is separate.
 */
export async function POST(req: Request) {
  const secret = adminPasscode();
  if (!secret) return NextResponse.json({ ok: true, open: true });

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const given = (body.code ?? '').trim();
  if (!given || given !== secret) {
    return NextResponse.json({ error: 'That is not the admin code.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}

/** Stepping back out, so a shared laptop is not left unlocked. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
