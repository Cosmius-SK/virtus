import type { Broadcast } from '@/lib/admin/broadcast';
import type { CustomTemplate } from '@/lib/db';
import type { House } from '@/lib/house';
import type { Entry } from '@/lib/org/types';

/**
 * What the whole firm shares.
 *
 * Everything the admin space sets is in here, and nothing personal is. That
 * split is the point: a broadcast, a house style, the organisation model and a
 * template built in Admin are all statements about the organisation, and they
 * were never device-scoped for a reason anybody could defend — they were
 * device-scoped because there was no server store. Notes, drafts and finished
 * documents stay on the device, because those are somebody's own work and the
 * brief is explicit about it (§4, §8.1).
 *
 * One document rather than four, because these are read together on every
 * screen and written one at a time by one person. Four documents would be four
 * reads to draw a page and four things to keep consistent, in exchange for
 * write concurrency between two admins that this will never have.
 */
export interface SharedDoc {
  /**
   * Bumped on every write. A save carries the version it read, and a save
   * against a stale version is refused rather than applied — so two admins on
   * the same afternoon get told, instead of one of them silently losing a
   * broadcast they thought they had posted.
   */
  version: number;
  updatedAt: number;
  broadcasts: Broadcast[];
  house?: House;
  org: Entry[];
  templates: CustomTemplate[];
}

export const EMPTY_DOC: SharedDoc = {
  version: 0,
  updatedAt: 0,
  broadcasts: [],
  org: [],
  templates: [],
};

/** Everything the endpoint will accept, with anything else dropped. */
export function cleanDoc(input: unknown): SharedDoc {
  const raw = (input ?? {}) as Partial<SharedDoc>;
  return {
    version: Number.isFinite(raw.version) ? Number(raw.version) : 0,
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : 0,
    broadcasts: Array.isArray(raw.broadcasts) ? raw.broadcasts : [],
    house: raw.house,
    org: Array.isArray(raw.org) ? raw.org : [],
    templates: Array.isArray(raw.templates) ? raw.templates : [],
  };
}

/** Whether a device holds anything worth offering to publish. */
export function isEmpty(doc: SharedDoc): boolean {
  return (
    doc.broadcasts.length === 0 &&
    doc.org.length === 0 &&
    doc.templates.length === 0 &&
    !doc.house
  );
}
