/**
 * A shared passcode, so a URL that gets forwarded is not an open door.
 *
 * Not identity — it says "you were told the code", nothing about who you are.
 * That is the right size for a demo and deliberately not a step towards one:
 * when the firm buys this, an IdP replaces it whole (§10) rather than growing
 * out of it.
 *
 * Edge-safe: Web Crypto only, because it runs in middleware on every request.
 */
const COOKIE = 'virtus_gate';

/** Empty means no gate. Lesson 12.10: fail open on a gate that can lock you out. */
export function passcode(): string {
  return process.env.VIRTUS_PASSCODE?.trim() ?? '';
}

export { COOKIE as GATE_COOKIE };

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The cookie value for a given passcode. Derived rather than random, so there
 * is no session store to keep — and changing the passcode invalidates every
 * cookie already issued, which is the behaviour you want when a code leaks.
 */
export function gateToken(secret: string): Promise<string> {
  return hmac('virtus-unlocked-v1', secret);
}

/** Constant-time-ish compare. Short strings, but no reason to leak length. */
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
