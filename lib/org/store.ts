'use client';

import { ownerId } from '@/lib/owner';
import { refresh, sharedLoaded, sharedSnapshot, update } from '@/lib/shared/client';
import type { Entry, EntryKind, OrgContext } from './types';

/**
 * Where the organisation model lives.
 *
 * The note that used to sit here said this should be server-side because a
 * plugin needs it too (§7), and that inventing a store for a caller that did
 * not exist would be the largest thing in the codebase serving nobody. That was
 * right at the time and it stopped being right the moment a second person
 * opened the URL: the people, systems and phrases a firm uses are facts about
 * the firm, and keeping them in one person's browser meant everybody else's
 * documents were written without them.
 *
 * The context still travels with the request, exactly as before — that is what
 * keeps the endpoints stateless and the plugin easy. What moved is where the
 * context is read from. A change of source, not of shape, as promised.
 */
async function ready(): Promise<void> {
  if (!sharedLoaded()) await refresh(false);
}

export async function all(): Promise<Entry[]> {
  await ready();
  return [...sharedSnapshot().doc.org].sort((a, b) => a.name.localeCompare(b.name));
}

function fresh(kind: EntryKind, name: string, about: string, now: number): Entry {
  return {
    id: crypto.randomUUID(),
    ownerId: ownerId(),
    kind,
    name: name.trim(),
    about: about.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function add(kind: EntryKind, name: string, about: string): Promise<void> {
  const now = Date.now();
  await update((doc) => ({ ...doc, org: [...doc.org, fresh(kind, name, about, now)] }));
}

/** Several at once, for the sample. One write, so the page settles in one go. */
export async function addMany(rows: { kind: EntryKind; name: string; about: string }[]) {
  const now = Date.now();
  await update((doc) => ({
    ...doc,
    org: [...doc.org, ...rows.map((r) => fresh(r.kind, r.name, r.about, now))],
  }));
}

export async function update_(
  id: string,
  part: Partial<Pick<Entry, 'name' | 'about' | 'kind'>>,
): Promise<void> {
  const now = Date.now();
  await update((doc) => ({
    ...doc,
    org: doc.org.map((e) => (e.id === id ? { ...e, ...part, updatedAt: now } : e)),
  }));
}
export { update_ as update };

export async function forget(id: string): Promise<void> {
  await update((doc) => ({ ...doc, org: doc.org.filter((e) => e.id !== id) }));
}

export async function context(): Promise<OrgContext> {
  return { entries: (await all()).map(({ kind, name, about }) => ({ kind, name, about })) };
}

/** Every name Virtus knows, for putting back what dictation mangles. */
export async function knownNames(): Promise<string[]> {
  return (await all()).map((e) => e.name);
}
