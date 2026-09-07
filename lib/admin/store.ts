'use client';

import { db, newId, type CustomTemplate, type Settings } from '@/lib/db';
import type { FormatDef } from '@/lib/formats/types';
import { ownerId } from '@/lib/owner';

/**
 * The admin space's storage — on the device, like everything else here.
 *
 * Worth being plain about what that means, because it is the thing somebody
 * will ask in a demo: the 26 templates that ship are part of the application
 * and are on every device that opens the URL. A template built here is not. It
 * lives in this browser until there is a server store, which is why every
 * template can be exported and imported as a file — a stopgap that is honest
 * about being one, rather than a sync feature that half works.
 */
export async function allTemplates(): Promise<CustomTemplate[]> {
  const rows = await db.templates.where('ownerId').equals(ownerId()).toArray();
  return rows.filter((t) => !t.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveTemplate(def: FormatDef, existingId?: string): Promise<string> {
  const now = Date.now();
  const id = existingId ?? newId();
  const existing = existingId ? await db.templates.get(existingId) : undefined;
  await db.templates.put({
    id,
    ownerId: ownerId(),
    def,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  return id;
}

/** Tombstoned rather than dropped, so a deletion can travel when sync arrives. */
export async function removeTemplate(id: string): Promise<void> {
  await db.templates.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function settings(): Promise<Settings | undefined> {
  const row = await db.settings.get('settings');
  return row?.ownerId === ownerId() ? row : undefined;
}

export async function setSettings(part: Partial<Pick<Settings, 'banner' | 'house'>>) {
  const now = Date.now();
  const existing = await settings();
  await db.settings.put({
    id: 'settings',
    ownerId: ownerId(),
    banner: existing?.banner,
    house: existing?.house,
    ...part,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}
