'use client';

import { db, type Artefact } from './db';
import { ownerId } from './owner';

/**
 * What this person has made.
 *
 * The artefacts have been stored since day one and never shown, which makes the
 * tool feel like a machine that forgets — you make a thing, you download it, and
 * as far as the app is concerned it never happened.
 *
 * Only artefacts appear here, never notes. That separation was taken on day one
 * (§4) and this is the first place it pays: a library is the thing you would
 * eventually share with a team, and raw capture is the thing you would not.
 */
export async function recent(limit = 50): Promise<Artefact[]> {
  const rows = await db.artefacts.where('ownerId').equals(ownerId()).toArray();
  return rows
    .filter((a) => !a.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function forget(id: string): Promise<void> {
  // A tombstone rather than a delete, so the removal can travel when sync
  // arrives (lesson 12.5) — a row that simply vanishes comes back on the next
  // pull from the other device.
  await db.artefacts.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export function when(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(at).toLocaleDateString();
}
