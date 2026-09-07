import { NextResponse } from 'next/server';
import { GATE_COOKIE, gateToken, passcode, same } from '@/lib/gate';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = passcode();
  if (!secret) return NextResponse.json({ ok: true });

  let given = '';
  try {
    const body = (await req.json()) as { passcode?: unknown };
    given = typeof body.passcode === 'string' ? body.passcode.trim() : '';
  } catch {
    return NextResponse.json({ error: 'That did not arrive properly.' }, { status: 400 });
  }

  if (!same(given, secret)) {
    return NextResponse.json({ error: 'That code does not work.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
