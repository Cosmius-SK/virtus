'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { add, all, forget, update } from '@/lib/org/store';
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

  const load = useCallback(() => {
    void all().then(setEntries);
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await add(kind, name, about);
    setName('');
    setAbout('');
    load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="text-xs text-ink/45 underline-offset-2 hover:text-accent hover:underline">
        ← back
      </Link>
      <h1 className="mt-4 text-2xl font-light tracking-tight text-ink">What Virtus knows</h1>
      <p className="mt-1 text-sm text-ink/55">
        The people, clients, systems and words this firm uses. Every document is written with these
        in front of it — which is the difference between output that is generic and output that is
        already yours.
      </p>

      {entries?.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-rule px-4 py-8 text-center text-sm text-ink/45">
          Nothing yet. Make a document and Virtus will offer to learn the names you used — that is
          the moment it is worth ten seconds.
        </p>
      )}

      {KINDS.map((group) => {
        const list = entries?.filter((e) => e.kind === group.id) ?? [];
        if (!list.length) return null;
        return (
          <section key={group.id} className="mt-7">
            <h2 className="text-[11px] uppercase tracking-wide text-ink/40">{group.label}</h2>
            <p className="mt-0.5 text-xs text-ink/40">{group.hint}</p>
            <ul className="mt-2 space-y-1.5">
              {list.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-rule bg-white px-3 py-2">
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
                      onBlur={(e) => void update(entry.id, { about: e.target.value })}
                      className="min-w-0 flex-1 bg-transparent text-sm text-ink/70 outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Forget this"
                      onClick={async () => {
                        await forget(entry.id);
                        load();
                      }}
                      className="text-ink/30 transition hover:text-ink"
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

      <form onSubmit={create} className="mt-10 rounded-lg border border-rule bg-white px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-ink/40">Add something</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded border px-2.5 py-1 text-xs transition ${
                kind === k.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-rule text-ink/60 hover:border-accent/50'
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
            className="w-48 rounded border border-rule px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
          />
          <input
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="A line about it"
            className="min-w-0 flex-1 rounded border border-rule px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="shrink-0 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-accent disabled:bg-ink/25"
          >
            Add
          </button>
        </div>
      </form>
    </main>
  );
}
