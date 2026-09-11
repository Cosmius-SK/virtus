'use client';

import { useEffect, useState } from 'react';
import { refresh, update } from '@/lib/shared/client';
import { useShared } from '@/lib/shared/use';
import { deviceHasUnpublished } from '@/lib/shared/client';
import type { SharedDoc } from '@/lib/shared/doc';
import { friendly } from '@/lib/friendly';

/**
 * Where this is kept, and who may change it.
 *
 * On the screen rather than in a document, because the question it answers is
 * one somebody asks in the middle of a demo — "so if he opens it, does he see
 * my templates?" — and the wrong answer is expensive. It used to be no, and the
 * screen said so honestly. Now it depends on whether a shared store is
 * configured, which is a real difference and so it is stated rather than
 * implied.
 */

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40';

export function WhereKept() {
  const { state, reload } = useShared();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [mine, setMine] = useState<SharedDoc | undefined>();
  const [published, setPublished] = useState(false);

  useEffect(() => {
    void deviceHasUnpublished().then(setMine);
  }, [state.where, state.doc.version]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setProblem(body.error ?? 'That is not the admin code.');
        return;
      }
      setCode('');
      await refresh();
      reload();
    } catch (err) {
      setProblem(friendly(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    await fetch('/api/admin/unlock', { method: 'DELETE' });
    await refresh();
    reload();
  }

  async function publish() {
    if (!mine) return;
    setBusy(true);
    setProblem(null);
    try {
      await update((doc) => ({
        ...doc,
        broadcasts: mine.broadcasts,
        house: mine.house ?? doc.house,
        org: mine.org,
        templates: mine.templates,
      }));
      setPublished(true);
      setMine(undefined);
    } catch (err) {
      setProblem(friendly(err).message);
    } finally {
      setBusy(false);
    }
  }

  const shared = state.where === 'shared';

  return (
    <div className="mb-6 rounded border border-line bg-lineSoft px-3 py-2.5">
      <p className="text-[12px] leading-relaxed text-ink60">
        {shared ? (
          <>
            <strong className="font-semibold text-ink">Everyone sees this.</strong> Broadcasts, the
            house style, the organisation model and any template built here are kept in the shared
            store{state.store ? ` (${state.store})` : ''} and reach every device that opens Virtus.
            Your notes, drafts and finished documents stay on this device and are not shared.
          </>
        ) : (
          <>
            <strong className="font-semibold text-ink">This device only.</strong> No shared store is
            configured, so everything set here stays in this browser — somebody else opening Virtus
            will not see it. Set <code className="text-[11px]">BLOB_READ_WRITE_TOKEN</code> and this
            page starts sharing without any other change.
          </>
        )}
      </p>

      {shared && state.open && (
        <p className="mt-2 text-[12px] leading-relaxed text-amber-800">
          No admin code is set, so anybody who can open Virtus can change what everybody sees. Set{' '}
          <code className="text-[11px]">VIRTUS_ADMIN_PASSCODE</code> to require one.
        </p>
      )}

      {shared && !state.open && !state.mayWrite && (
        <form onSubmit={unlock} className="mt-3">
          <span className={LABEL}>Admin code</span>
          <p className="mt-1 text-[12px] leading-relaxed text-ink60">
            You can read everything here. Changing what the firm sees needs the code.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Unlock
            </button>
          </div>
        </form>
      )}

      {shared && !state.open && state.mayWrite && (
        <p className="mt-2 text-[12px] text-ink60">
          Unlocked for twelve hours.{' '}
          <button type="button" onClick={() => void lock()} className="underline hover:text-ink">
            Lock again
          </button>
        </p>
      )}

      {mine && state.mayWrite && (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-[12px] leading-relaxed text-amber-900">
            The shared store is empty and this device is holding {mine.templates.length} template
            {mine.templates.length === 1 ? '' : 's'}, {mine.org.length} organisation entr
            {mine.org.length === 1 ? 'y' : 'ies'} and {mine.broadcasts.length} broadcast
            {mine.broadcasts.length === 1 ? '' : 's'} from before this was shared. Nothing has been
            sent anywhere — publishing is a decision, not a migration that happens to you.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publish()}
            className="mt-2 rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
          >
            Publish these to everyone
          </button>
        </div>
      )}

      {published && (
        <p className="mt-2 text-[12px] text-ink60">
          Published. Everyone opening Virtus now sees them.
        </p>
      )}
      {problem && <p className="mt-2 text-[12px] text-red-700">{problem}</p>}
    </div>
  );
}
