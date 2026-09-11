'use client';

import { db, type CustomTemplate } from '@/lib/db';
import { ownerId } from '@/lib/owner';
import type { Entry } from '@/lib/org/types';
import { EMPTY_DOC, type SharedDoc } from './doc';

/**
 * The same document, kept on this device.
 *
 * Not a second implementation of the feature — a second *place*. Everything
 * above this reads and writes one `SharedDoc`; this module is what that means
 * when there is no shared store configured, and `lib/shared/driver.ts` is what
 * it means when there is. Keeping both behind one shape is why turning the
 * shared store on is a configuration change rather than a code change.
 *
 * It writes the existing tables rather than a new one, so a device that has
 * been used already keeps what is in it.
 */
export async function readDevice(): Promise<SharedDoc> {
  const mine = ownerId();
  const [templates, org, settings] = await Promise.all([
    db.templates.where('ownerId').equals(mine).toArray(),
    db.org.where('ownerId').equals(mine).toArray(),
    db.settings.get('settings'),
  ]);
  const own = settings?.ownerId === mine ? settings : undefined;
  return {
    ...EMPTY_DOC,
    version: own?.updatedAt ?? 0,
    updatedAt: own?.updatedAt ?? 0,
    broadcasts: own?.broadcasts ?? [],
    house: own?.house,
    org: org.filter((e) => !e.deletedAt),
    templates: templates.filter((t) => !t.deletedAt),
  };
}

/**
 * Rows that were there and are not in the document any more are tombstoned
 * rather than dropped, which is the convention the tables already use so that a
 * deletion can travel when sync arrives. A plain overwrite would make a removal
 * look like a row that never existed.
 *
 * Written out for each table rather than through one generic helper: the
 * generic version needed two casts to satisfy Dexie's types, and a cast is a
 * place where the compiler has stopped checking exactly where the two tables
 * differ.
 */
export async function writeDevice(doc: SharedDoc): Promise<void> {
  const mine = ownerId();
  const now = Date.now();

  const templates: CustomTemplate[] = doc.templates.map((t) => ({ ...t, ownerId: mine }));
  const keptTemplates = new Set(templates.map((t) => t.id));
  const hadTemplates = await db.templates.where('ownerId').equals(mine).toArray();
  await db.templates.bulkPut(templates);
  for (const row of hadTemplates) {
    if (!row.deletedAt && !keptTemplates.has(row.id)) {
      await db.templates.update(row.id, { deletedAt: now, updatedAt: now });
    }
  }

  const org: Entry[] = doc.org.map((e) => ({ ...e, ownerId: mine }));
  const keptOrg = new Set(org.map((e) => e.id));
  const hadOrg = await db.org.where('ownerId').equals(mine).toArray();
  await db.org.bulkPut(org);
  for (const row of hadOrg) {
    if (!row.deletedAt && !keptOrg.has(row.id)) {
      await db.org.update(row.id, { deletedAt: now, updatedAt: now });
    }
  }

  const existing = await db.settings.get('settings');
  await db.settings.put({
    id: 'settings',
    ownerId: mine,
    broadcasts: doc.broadcasts,
    house: doc.house,
    banner: existing?.banner,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}
