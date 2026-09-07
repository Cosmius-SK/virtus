'use client';

import { db } from '@/lib/db';
import { ownerId } from '@/lib/owner';
import type { Entry, EntryKind, OrgContext } from './types';

/**
 * Where the organisation model lives — for now, on the device, like everything
 * else.
 *
 * The brief says this should be server-side because a plugin needs it too (§7).
 * It is not, yet, and the reason is worth writing down: there is no server
 * store, and inventing one now would be the largest thing in the codebase in
 * service of a caller that does not exist. Instead the context travels with the
 * request. That keeps the endpoints stateless, which is what actually makes the
 * plugin easy later — it will pass its own context the same way — and moving
 * the storage is then a change of source, not of shape.
 */
export async function all(): Promise<Entry[]> {
  const rows = await db.org.where('ownerId').equals(ownerId()).toArray();
  return rows.filter((e) => !e.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}

export async function add(kind: EntryKind, name: string, about: string): Promise<void> {
  const now = Date.now();
  await db.org.put({
    id: crypto.randomUUID(),
    ownerId: ownerId(),
    kind,
    name: name.trim(),
    about: about.trim(),
    createdAt: now,
    updatedAt: now,
  });
}

/** Several at once, for the sample. One write, so the page settles in one go. */
export async function addMany(rows: { kind: EntryKind; name: string; about: string }[]) {
  const now = Date.now();
  await db.org.bulkPut(
    rows.map((row) => ({
      id: crypto.randomUUID(),
      ownerId: ownerId(),
      kind: row.kind,
      name: row.name.trim(),
      about: row.about.trim(),
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function update(id: string, part: Partial<Pick<Entry, 'name' | 'about' | 'kind'>>) {
  await db.org.update(id, { ...part, updatedAt: Date.now() });
}

export async function forget(id: string): Promise<void> {
  await db.org.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function context(): Promise<OrgContext> {
  return { entries: (await all()).map(({ kind, name, about }) => ({ kind, name, about })) };
}

/** Every name Virtus knows, for putting back what dictation mangles. */
export async function knownNames(): Promise<string[]> {
  return (await all()).map((e) => e.name);
}
