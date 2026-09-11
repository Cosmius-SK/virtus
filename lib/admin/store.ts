'use client';

import { newId, type CustomTemplate, type Settings } from '@/lib/db';
import type { SharedDoc } from '@/lib/shared/doc';
import { ownerId } from '@/lib/owner';
import type { FormatDef } from '@/lib/formats/types';
import {
  refresh,
  sharedLoaded,
  sharedSnapshot,
  subscribeShared,
  update,
} from '@/lib/shared/client';

/**
 * The admin space's storage.
 *
 * It used to say "on the device, like everything else here", and that was a
 * limitation dressed as a decision. A broadcast is a statement to the whole
 * firm; a house style is the firm's; the organisation model is what the firm
 * knows about itself. None of those are facts about one laptop, and a demo
 * where the leader opens the URL and sees an empty Admin proves the point
 * faster than any argument — the second caller the notes were waiting for is
 * simply somebody else's browser.
 *
 * What changed is the source, not the shape (§7). Every function below reads
 * and writes the same `SharedDoc`; `lib/shared/client.ts` decides whether that
 * document lives in the shared store or on this device, and the screens say
 * which. Personal work — notes, drafts, finished documents — did not move and
 * should not.
 */

export { subscribeShared, sharedLoaded, sharedSnapshot } from '@/lib/shared/client';
export { NotAllowed, Stale } from '@/lib/shared/client';

export async function allTemplates(): Promise<CustomTemplate[]> {
  if (!sharedLoaded()) await refresh(false);
  return [...sharedSnapshot().doc.templates].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveTemplate(def: FormatDef, existingId?: string): Promise<string> {
  const now = Date.now();
  const id = existingId ?? newId();
  await update((doc) => {
    const was = doc.templates.find((t) => t.id === id);
    const row: CustomTemplate = {
      id,
      ownerId: was?.ownerId ?? ownerId(),
      def,
      createdAt: was?.createdAt ?? now,
      updatedAt: now,
    };
    return {
      ...doc,
      templates: was ? doc.templates.map((t) => (t.id === id ? row : t)) : [...doc.templates, row],
    };
  });
  return id;
}

/**
 * Removed from the shared document rather than tombstoned in it.
 *
 * The tombstone existed so a deletion could travel when sync arrived. It has
 * arrived: the document is the state, everybody reads the same one, and a row
 * that is not in it is gone for everyone. Keeping tombstones here as well would
 * mean carrying deleted templates in every read of a document whose whole
 * virtue is being small. The device fallback still tombstones its own tables,
 * because those are a cache of this and a removal has to be visible there.
 */
export async function removeTemplate(id: string): Promise<void> {
  await update((doc) => ({ ...doc, templates: doc.templates.filter((t) => t.id !== id) }));
}

/**
 * The settings shape the screens already read. Derived from the shared document
 * rather than stored: `Settings` is what a component wants, `SharedDoc` is what
 * is kept, and making the screens learn the second one would have been a
 * rewrite of nine files to gain nothing.
 */
let compatFor: SharedDoc | undefined;
let compat: Settings | undefined;

export function settingsSnapshotCompat(): Settings | undefined {
  if (!sharedLoaded()) return undefined;
  const { doc } = sharedSnapshot();

  // Cached against the document it was derived from, and this is not an
  // optimisation. `useSyncExternalStore` compares what the getter returns with
  // what it returned last time; a fresh object every call is never equal to
  // itself, so React re-renders, calls the getter again, and the page dies with
  // "maximum update depth exceeded". It does so only in the browser, and only
  // once something actually subscribes — typecheck, lint, the whole test suite
  // and the production build were all green while every screen was blank.
  if (doc !== compatFor) {
    compatFor = doc;
    compat = {
      id: 'settings',
      ownerId: ownerId(),
      broadcasts: doc.broadcasts,
      house: doc.house,
      createdAt: doc.updatedAt,
      updatedAt: doc.updatedAt,
    };
  }
  return compat;
}

export async function settings(): Promise<Settings | undefined> {
  if (!sharedLoaded()) await refresh(false);
  return settingsSnapshotCompat();
}

export const refreshSettings = refresh;
export const subscribeSettings = subscribeShared;
export const settingsLoaded = sharedLoaded;

export async function setSettings(part: Partial<Pick<Settings, 'broadcasts' | 'house'>>) {
  await update((doc) => ({
    ...doc,
    broadcasts: part.broadcasts ?? doc.broadcasts,
    house: 'house' in part ? part.house : doc.house,
  }));
}
