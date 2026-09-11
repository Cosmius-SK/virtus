'use client';

import Dexie, { type Table } from 'dexie';
import type { Broadcast } from './admin/broadcast';
import type { FormatDef, FormatDoc } from './formats/types';
import type { House } from './house';
import type { Run } from './meter';
import type { Entry } from './org/types';
import type { Outline, Structure } from './types';

/**
 * Local-first storage. Capture is instant and offline (§8.1); this is biblio's
 * best idea and it transfers unchanged.
 *
 * Two decisions here are insurance taken while it is still free (§4).
 *
 * 1. Private thinking and finished artefacts are SEPARATE KINDS OF RECORD, even
 *    though both are private today. Raw capture is one thing; a finished deck
 *    is another. When the organisation asks for team libraries, retention and
 *    "share this with my director", that is then a switch on one class of
 *    record rather than a rewrite of the storage layer. Letting them blur
 *    together now and separating them later is the expensive version — and
 *    blurring is what happens if nobody decides.
 *
 * 2. Every record carries an ownerId from the first migration, even while there
 *    is only ever one person. A column nobody reads is free; adding an identity
 *    column to a table full of real data is a migration, a backfill and a bug.
 */

/** Common to both classes of record. */
interface Owned {
  /** Always present, read from the session — never assumed (§4). */
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  /** Tombstone, so a deletion can travel when sync arrives. */
  deletedAt?: number;
}

/** PRIVATE THINKING. Raw capture. Never leaves the person unless they say so. */
export interface Note extends Owned {
  id: string;
  text: string;
  /** The structure pass, once it has run. Cached so it is paid for once. */
  structure?: Structure;
}

/**
 * WORK IN PROGRESS. Something started and not yet produced.
 *
 * There are two kinds and they share a table because they are the same thing at
 * different stages: `id: 'draft'` is the single custom-deck note, saved at
 * typing speed so words are never lost (§8.1); a row with a `formatId` is a
 * template part-filled and left. Both are private thinking, not artefacts (§4),
 * and neither has produced a file.
 *
 * Kept to six per person. A draft list long enough to need searching is a
 * second document library, and the reason to come back to a draft expires.
 */
export interface Draft extends Owned {
  /** 'draft' for the custom-deck note; a uuid for a saved template. */
  id: string;
  /** The custom-deck note, or a line of what was written, for the list. */
  text: string;
  formatId?: string;
  formatName?: string;
  /** What was typed into each section's box. */
  parts?: Record<string, string>;
  extra?: string;
}

/**
 * A FINISHED ARTEFACT. The thing that leaves the building (§10). Kept apart
 * from thinking so that sharing, retention and team libraries land on this
 * table alone.
 */
export interface Artefact extends Owned {
  id: string;
  noteId: string;
  /** One row per format. Formats are many; shapes stay at seven. */
  kind: 'deck' | 'format';
  /** Which format, when kind is 'format'. */
  formatId?: string;
  title: string;
  outline?: Outline;
  doc?: FormatDoc;
  /** Private today. The field exists so that changing it later is a switch. */
  visibility: 'private';
}

/**
 * A TEMPLATE SOMEBODY BUILT HERE, rather than one shipped in the registry.
 *
 * The same `FormatDef` the built-in ones are, because the engine must not be
 * able to tell them apart — the moment a custom template is a second kind of
 * thing, every renderer grows a branch and the twenty-seventh format costs what
 * the first one did.
 *
 * It lives on the device with everything else, and therefore travels with the
 * request rather than being looked up on the server (§7). That is the same
 * decision the organisation model made and for the same reason: the endpoints
 * stay stateless, and moving the storage later is a change of source, not of
 * shape.
 */
export interface CustomTemplate extends Owned {
  id: string;
  def: FormatDef;
}

/**
 * WHAT THE ADMIN HAS SET for everyone using this device.
 *
 * One row, not a table of key-values: the settings are read together on every
 * page load and a single record is one read rather than four.
 */
export interface Settings extends Owned {
  id: 'settings';
  /**
   * The broadcast strip: up to six messages, shown in the order they were added,
   * each with its own dates. Operational and temporary — a trial, an outage, a
   * freeze. Deliberately NOT the classification line, which is a control set by
   * whoever deployed this and must not be editable by whoever is using it.
   */
  broadcasts?: Broadcast[];
  /**
   * The single banner this replaced. Kept, not migrated: a device that already
   * holds one is read through `broadcastsOf`, which folds it into the list, and
   * the first save writes the new shape. Deleting the field would throw away a
   * notice somebody put up and still expects to see.
   *
   * @deprecated Read `broadcasts` via `lib/admin/broadcast.ts`.
   */
  banner?: { on: boolean; text: string; tone: 'info' | 'warn' | 'alert' };
  /** A house style read out of an uploaded deck. See lib/house.ts. */
  house?: House;
}

class VirtusDB extends Dexie {
  notes!: Table<Note, string>;
  drafts!: Table<Draft, string>;
  artefacts!: Table<Artefact, string>;
  runs!: Table<Run, string>;
  org!: Table<Entry, string>;
  templates!: Table<CustomTemplate, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('virtus');
    // The list of record types lives in ONE file (lesson 12.5). It has been
    // wrong in two files before, and sync fails silently — a mismatch does not
    // error anywhere, it just means something a person wrote never arrives.
    this.version(1).stores({
      notes: 'id, ownerId, updatedAt',
      drafts: 'id, ownerId, updatedAt',
      artefacts: 'id, ownerId, noteId, updatedAt',
    });
    // The meter (lib/meter.ts). A separate migration rather than an edit to
    // version 1, because a browser that already holds someone's notes must
    // upgrade rather than be rebuilt.
    this.version(2).stores({
      runs: 'id, ownerId, formatId, createdAt',
    });
    // The organisation model (lib/org/). Its own migration for the same reason:
    // a browser holding someone's work upgrades rather than being rebuilt.
    this.version(3).stores({
      org: 'id, ownerId, kind, name',
    });
    // The admin space: templates built here, and what the admin has set. Its
    // own migration for the same reason as every other one — a browser holding
    // someone's work upgrades rather than being rebuilt.
    this.version(4).stores({
      templates: 'id, ownerId, updatedAt',
      settings: 'id, ownerId',
    });
  }
}

export const db = new VirtusDB();

export function newId(): string {
  return crypto.randomUUID();
}
