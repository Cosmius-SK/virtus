'use client';

import { db, type Draft } from './db';
import { ownerId } from './owner';

/**
 * The single in-progress capture.
 *
 * One draft, not a list. It saves at typing speed locally, because the words
 * are what must never be lost and the network is not what makes that true
 * (§8.1).
 *
 * The shape follows biblio's `lib/drafts.ts` (§9) minus the crypto and Drive
 * machinery, which arrive with sync. The part that is here from day one is the
 * part that was learned the hard way (lesson 12.3): a phone freezes the page
 * the moment it is backgrounded, and an in-flight fetch dies with it. Anything
 * that must survive leaving goes via sendBeacon, with its body computed BEFORE
 * that moment — an await on the way out is a bet the page will still be
 * running.
 */
const ID = 'draft' as const;
/** Synchronous hint, readable before IndexedDB wakes. */
const LS_HINT = 'virtus_draft';
const SAVE_MS = 800;

let saveTimer: number | null = null;
let pending: string | null = null;
let listening = false;

function setHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(LS_HINT, '1');
    else localStorage.removeItem(LS_HINT);
  } catch {
    /* private mode */
  }
}

/** Cheap synchronous "there is something waiting" check. */
export function draftHint(): boolean {
  try {
    return localStorage.getItem(LS_HINT) === '1';
  } catch {
    return false;
  }
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const d = (await db.drafts.get(ID)) ?? null;
    setHint(!!d && d.text.trim().length > 0);
    return d && d.text.trim().length > 0 ? d : null;
  } catch {
    return null;
  }
}

/**
 * A copy of the draft ready to leave with no async work left to do.
 *
 * Prepared on every save rather than at the moment of leaving, because at the
 * moment of leaving there is no time left to prepare anything.
 */
let beacon: string | null = null;
/** Beacons are refused above roughly 64KB. */
const BEACON_MAX = 50_000;

function prepareBeacon(text: string): void {
  const body = JSON.stringify({ id: ID, ownerId: ownerId(), text, at: Date.now() });
  beacon = body.length <= BEACON_MAX ? body : null;
}

/**
 * Sync has not been built yet, so there is nowhere for the beacon to go. The
 * machinery stays because the lesson is about the moment, not the endpoint: the
 * body is computed on every save, so when /api/sync exists this is a one-line
 * change and not a rewrite of when things are encoded.
 */
const SYNC_ENABLED = false;

/** Fire the prepared copy. Returns whether anything was sent. */
function sendBeaconNow(): boolean {
  if (!SYNC_ENABLED) return false;
  if (!beacon || typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
  try {
    return navigator.sendBeacon('/api/sync', new Blob([beacon], { type: 'application/json' }));
  } catch {
    return false;
  }
}

function ensureListeners(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // The reliable one. `beforeunload` is not dependable in an installed PWA,
  // and this is exactly the "put the phone down" moment.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    sendBeaconNow();
    void flushDraft();
  });
  window.addEventListener('pagehide', () => {
    sendBeaconNow();
    void flushDraft();
  });
}

/** Save at typing speed. Cheap, local, debounced. */
export function queueDraftSave(text: string): void {
  ensureListeners();
  pending = text;
  setHint(text.trim().length > 0);
  prepareBeacon(text);
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void flushDraft(), SAVE_MS);
}

/** Write anything outstanding. */
export async function flushDraft(): Promise<void> {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  const text = pending;
  pending = null;
  if (text === null) return;
  try {
    const now = Date.now();
    if (text.trim().length === 0) {
      await db.drafts.delete(ID);
      setHint(false);
      beacon = null;
      return;
    }
    const existing = await db.drafts.get(ID);
    await db.drafts.put({
      id: ID,
      ownerId: ownerId(),
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    setHint(true);
  } catch {
    /* nothing here is worth interrupting someone mid-sentence for */
  }
}

/** The draft became a note. */
export async function clearDraft(): Promise<void> {
  pending = null;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = null;
  beacon = null;
  await db.drafts.delete(ID);
  setHint(false);
}

/* ------------------------------------------------------------------------- *
 * Saved templates.
 *
 * The custom-deck note above is one row saved at typing speed. A part-filled
 * template is the same idea with more in it: somebody opened a template, typed
 * half of what they knew, and was interrupted. Losing that is losing the only
 * copy of thinking they had already done.
 *
 * Six per person, oldest dropped. A draft list long enough to need searching is
 * a second document library, and the reason to come back to a draft expires —
 * a status report abandoned three weeks ago is not worth resuming, it is worth
 * starting again from what happened since.
 * ------------------------------------------------------------------------- */
const KEEP = 6;

export async function savedDrafts(): Promise<Draft[]> {
  const rows = await db.drafts.where('ownerId').equals(ownerId()).toArray();
  return rows
    .filter((d) => d.formatId && !d.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Write a template draft, and keep the list to six by dropping the oldest. */
export async function saveTemplateDraft(draft: {
  id: string;
  formatId: string;
  formatName: string;
  parts: Record<string, string>;
  extra: string;
}): Promise<void> {
  const now = Date.now();
  const existing = await db.drafts.get(draft.id);
  const text = [...Object.values(draft.parts), draft.extra]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
  await db.drafts.put({
    id: draft.id,
    ownerId: ownerId(),
    text,
    formatId: draft.formatId,
    formatName: draft.formatName,
    parts: draft.parts,
    extra: draft.extra,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const all = await savedDrafts();
  for (const old of all.slice(KEEP)) await db.drafts.delete(old.id);
}

export async function discardDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}
