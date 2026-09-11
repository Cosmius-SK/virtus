'use client';

import { friendly } from '@/lib/friendly';
import { cleanDoc, EMPTY_DOC, isEmpty, type SharedDoc } from './doc';
import { readDevice, writeDevice } from './device';

/**
 * One copy of what the firm shares, and everyone watching it.
 *
 * The subscriber pattern is the one the broadcast already needed and for the
 * same reason: the strip is set on the Admin screen and drawn in the header,
 * two components that never meet. Each reading storage into its own state was
 * the bug that made the banner appear only after a refresh.
 *
 * What is new is that the storage may be somewhere else. `where` says which,
 * and the screens say it out loud rather than letting somebody assume their
 * template is on a colleague's machine when it is not.
 */

export type Where = 'shared' | 'device' | 'unknown';

export interface SharedState {
  doc: SharedDoc;
  where: Where;
  /** What the store calls itself, e.g. "Vercel Blob". Shown on the Admin screen. */
  store?: string;
  /** Whether this browser may write. False only when an admin code is set and unmet. */
  mayWrite: boolean;
  /** True when no admin code is configured at all, so anybody could write. */
  open: boolean;
}

let state: SharedState = { doc: EMPTY_DOC, where: 'unknown', mayWrite: true, open: true };
let loaded = false;
const listeners = new Set<() => void>();

const channel =
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('virtus-shared');
if (channel) channel.onmessage = () => void refresh(false);

function emit() {
  for (const tell of listeners) tell();
}

export function subscribeShared(tell: () => void): () => void {
  listeners.add(tell);
  return () => listeners.delete(tell);
}

export const sharedSnapshot = (): SharedState => state;
export const sharedLoaded = (): boolean => loaded;

async function askPermission(): Promise<Pick<SharedState, 'mayWrite' | 'open'>> {
  try {
    const res = await fetch('/api/shared', { method: 'HEAD' });
    return {
      mayWrite: res.headers.get('x-virtus-admin') === '1',
      open: res.headers.get('x-virtus-admin-open') === '1',
    };
  } catch {
    return { mayWrite: true, open: true };
  }
}

/**
 * Read once, from wherever this deployment keeps it.
 *
 * A failure to reach the shared store falls back to the device rather than to
 * an empty screen: somebody looking at Admin during a blip should see what they
 * had, not be told they have nothing.
 */
export async function refresh(tell = true): Promise<SharedState> {
  let next: SharedState;
  try {
    const res = await fetch('/api/shared', { cache: 'no-store' });
    const body = (await res.json()) as { shared?: boolean; where?: string; doc?: unknown };
    if (body.shared && body.doc) {
      const permission = await askPermission();
      next = { doc: cleanDoc(body.doc), where: 'shared', store: body.where, ...permission };
    } else {
      next = { doc: await readDevice(), where: 'device', mayWrite: true, open: true };
    }
  } catch {
    next = { doc: await readDevice(), where: 'device', mayWrite: true, open: true };
  }

  state = next;
  loaded = true;
  emit();
  if (tell && channel) channel.postMessage('changed');
  return state;
}

export class NotAllowed extends Error {}
export class Stale extends Error {}

/**
 * Change what the firm shares.
 *
 * The whole document goes back, carrying the version it was read at. A save
 * against a version somebody else has moved past is refused rather than
 * applied — two admins on the same afternoon is rare, and silently losing the
 * broadcast one of them thought they had posted is not a way to find out it
 * happened.
 */
export async function update(change: (doc: SharedDoc) => SharedDoc): Promise<SharedState> {
  if (!loaded) await refresh(false);
  const next = change(state.doc);

  if (state.where === 'device') {
    await writeDevice(next);
    return refresh();
  }

  const res = await fetch('/api/shared', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc: next, version: state.doc.version }),
  });

  if (res.status === 403) throw new NotAllowed('The admin code is needed to change this.');
  if (res.status === 409) {
    await refresh();
    throw new Stale(
      'Somebody else changed this while you were editing. Nothing was saved — your screen now shows theirs.',
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? friendly(new Error('save failed')).message);
  }
  return refresh();
}

/** Whether this device is holding admin data the shared store does not have. */
export async function deviceHasUnpublished(): Promise<SharedDoc | undefined> {
  if (state.where !== 'shared' || !isEmpty(state.doc)) return undefined;
  const mine = await readDevice();
  return isEmpty(mine) ? undefined : mine;
}
