'use client';

import { useCallback, useEffect, useState } from 'react';
import { SAMPLE_ORG } from '@/lib/org/sample';
import { add, addMany, all, forget, update } from '@/lib/org/store';
import { refusal } from '@/lib/shared/say';
import { KINDS, type Entry, type EntryKind } from '@/lib/org/types';

/**
 * What Virtus knows about this organisation.
 *
 * A place to review and correct — not a place to fill in. Things get here by
 * being offered under a finished document, at the moment the reason is obvious
 * (§3). A page that has to be visited before the tool is useful is a page
 * nobody visits, and that is exactly how biblio's cast failed the first time.
 */
export default function Organisation() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [kind, setKind] = useState<EntryKind>('person');
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * The organisation model is shared now, so a write can be refused — no admin
   * code, or somebody editing at the same time. Every write on this screen goes
   * through here so that a refusal is said rather than swallowed: an entry that
   * silently fails to save is one that is missing from a document later, and
   * nothing on the screen will have suggested it was.
   */
  async function writing(work: () => Promise<void>) {
    try {
      setProblem(null);
      await work();
    } catch (err) {
      setProblem(refusal(err));
    } finally {
      load();
    }
  }

  const load = useCallback(() => {
    void all().then(setEntries);
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await writing(async () => {
      await add(kind, name, about);
      setName('');
      setAbout('');
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-9">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Organisation</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink60">
        The people, clients, systems and terminology this organisation uses. Every document is
        written with this in front of it — the difference between generic output and output that is
        already yours.
      </p>

      {problem && <p className="mt-4 text-[12px] text-red-700">{problem}</p>}

      {entries?.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <p className="text-sm text-ink60">
            Nothing recorded yet. Produce a document and Virtus will offer to learn the names you
            used, or add them below.
          </p>
          <button
            type="button"
            onClick={async () => {
              await writing(() => addMany(SAMPLE_ORG));
            }}
            className="mt-3 rounded border border-line bg-paper px-3.5 py-1.5 text-[12px] font-medium text-ink transition hover:border-accent hover:text-accent"
          >
            Load a sample organisation
          </button>
          <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-ink40">
            A fictional firm, to see the difference this makes. Everything it adds is editable and
            removable.
          </p>
        </div>
      )}

      {KINDS.map((group) => {
        const list = entries?.filter((e) => e.kind === group.id) ?? [];
        if (!list.length) return null;
        return (
          <section key={group.id} className="mt-7">
            <h2 className="text-[11px] uppercase tracking-wide text-ink40">{group.label}</h2>
            <p className="mt-0.5 text-xs text-ink40">{group.hint}</p>
            <ul className="mt-2 space-y-1.5">
              {list.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-line bg-paper px-3 py-2 shadow-card">
                  <div className="flex items-start gap-2">
                    <input
                      value={entry.name}
                      onChange={(e) => {
                        setEntries((rows) =>
                          rows!.map((r) => (r.id === entry.id ? { ...r, name: e.target.value } : r)),
                        );
                      }}
                      onBlur={(e) => void update(entry.id, { name: e.target.value })}
                      className="w-40 shrink-0 bg-transparent text-sm font-medium text-ink outline-none"
                    />
                    <input
                      value={entry.about}
                      placeholder={
                        group.id === 'person'
                          ? 'Role, and how they like to be written to'
                          : group.id === 'term'
                            ? 'What it means here'
                            : 'A line about it'
                      }
                      onChange={(e) => {
                        setEntries((rows) =>
                          rows!.map((r) => (r.id === entry.id ? { ...r, about: e.target.value } : r)),
                        );
                      }}
                      onBlur={(e) => void writing(() => update(entry.id, { about: e.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm text-ink80 outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={async () => {
                        await writing(() => forget(entry.id));
                      }}
                      className="text-ink40 transition hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <form onSubmit={create} className="mt-10 rounded-lg border border-line bg-paper px-4 py-4 shadow-card">
        <p className="text-[11px] uppercase tracking-wide text-ink40">Add an entry</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded border px-2.5 py-1 text-xs transition ${
                kind === k.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-ink60 hover:border-accent/50'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, spelled exactly right"
            className="w-48 rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          <input
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="A line about it"
            className="min-w-0 flex-1 rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="shrink-0 rounded bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>
    </main>
  );
}
