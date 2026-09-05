'use client';

/**
 * Who this is (§4).
 *
 * Day one needs no login, but colleagues arrive sooner than customers would, so
 * the user is READ FROM A SESSION rather than assumed. Today the session is a
 * device-local id; when the firm's IdP arrives, only this function changes and
 * every record already has somewhere to put the answer.
 */
const KEY = 'virtus_owner';

let cached: string | null = null;

export function ownerId(): string {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return (cached = stored);
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return (cached = fresh);
  } catch {
    // Private mode. A per-tab identity is still an identity.
    return (cached = crypto.randomUUID());
  }
}
