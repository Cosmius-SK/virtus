import { gateToken, same } from '@/lib/gate';

/**
 * A second passcode, for changing what everybody sees.
 *
 * The app passcode says "you were told the code". That is the right size for
 * getting in. It is the wrong size for editing a strip that appears on every
 * screen in the firm saying what may and may not be typed into this tool: a
 * control the people bound by it can rewrite is not a control, which is the
 * same sentence already written about the classification line.
 *
 * Derived from the same HMAC as the app gate rather than a second mechanism,
 * so there is still no session store to keep, and changing the admin code
 * invalidates every cookie already issued.
 *
 * Unset means open, exactly as the app gate does (lesson 12.10). A deployment
 * where nobody configured an admin code behaves as it did before this existed,
 * and the Admin screen says out loud that it is unprotected rather than letting
 * somebody assume otherwise. Failing closed would ship deployments with an
 * Admin nobody can open and no way to fix it from inside.
 */
export const ADMIN_COOKIE = 'virtus_admin';

export function adminPasscode(): string {
  return process.env.VIRTUS_ADMIN_PASSCODE?.trim() ?? '';
}

/** The cookie value for the configured admin code. */
export function adminToken(secret: string): Promise<string> {
  return gateToken(`admin:${secret}`);
}

/** Whether this request may change what everybody sees. */
export async function mayAdmin(cookie: string | undefined): Promise<boolean> {
  const secret = adminPasscode();
  if (!secret) return true;
  if (!cookie) return false;
  return same(cookie, await adminToken(secret));
}
