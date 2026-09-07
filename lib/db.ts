'use client';

import Dexie, { type Table } from 'dexie';
import type { FormatDoc } from './formats/types';
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

/** The single in-progress capture. One draft, not a list. */
export interface Draft extends Owned {
  id: 'draft';
  text: string;
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

class VirtusDB extends Dexie {
  notes!: Table<Note, string>;
  drafts!: Table<Draft, string>;
  artefacts!: Table<Artefact, string>;

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
  }
}

export const db = new VirtusDB();

export function newId(): string {
  return crypto.randomUUID();
}
