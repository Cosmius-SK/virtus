'use client';

import { useEffect, useState } from 'react';
import { Capture } from '@/components/Capture';
import { DocEditor } from '@/components/DocEditor';
import { FormatPicker, type FormatSummary } from '@/components/FormatPicker';
import { OutlineEditor } from '@/components/OutlineEditor';
import { db, newId } from '@/lib/db';
import { FORMATS, formatById } from '@/lib/formats/registry';
import type { FormatDoc } from '@/lib/formats/types';
import { clearDraft } from '@/lib/drafts';
import { recordRun } from '@/lib/meter';
import { ownerId } from '@/lib/owner';
import type { Outline, Structure } from '@/lib/types';

/** The multi-slide deck is not a one-pager format, so it sits beside them. */
const DECK: FormatSummary = {
  id: 'deck',
  name: 'Full deck',
  description: 'Several slides — the argument first, as an outline you approve before anything is drawn.',
};

const CHOICES: FormatSummary[] = [
  ...FORMATS.map(({ id, name, description }) => ({ id, name, description })),
  DECK,
];

type Stage = 'capture' | 'doc' | 'outline';

export default function Page() {
  const [stage, setStage] = useState<Stage>('capture');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formatId, setFormatId] = useState<string | null>(null);
  const [doc, setDoc] = useState<FormatDoc | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [took, setTook] = useState<number | null>(null);

  const format = formatId ? formatById(formatId) : undefined;

  async function keepNote(structure?: Structure): Promise<string> {
    const id = newId();
    const now = Date.now();
    await db.notes.put({
      id,
      ownerId: ownerId(),
      text: note,
      structure,
      createdAt: now,
      updatedAt: now,
    });
    setNoteId(id);
    return id;
  }

  async function pick(id: string) {
    if (note.trim().length < 20) {
      setError('Put a few sentences in the box first.');
      return;
    }
    setBusyId(id);
    setError(null);
    const started = Date.now();
    try {
      const name = CHOICES.find((c) => c.id === id)?.name ?? id;

      if (id === 'deck') {
        const s = await post<{ structure: Structure; usage: Usage }>('/api/structure', { note });
        const o = await post<{ outline: Outline; usage: Usage }>('/api/outline', {
          structure: s.structure,
          ask: '',
        });
        await keepNote(s.structure);
        setStructure(s.structure);
        setOutline(o.outline);
        setStage('outline');
        // Two calls make one document, so they are metered as one run.
        await recordRun({
          formatId: id,
          formatName: name,
          model: s.usage.model,
          inputTokens: s.usage.inputTokens + o.usage.inputTokens,
          outputTokens: s.usage.outputTokens + o.usage.outputTokens,
          ms: Date.now() - started,
        });
      } else {
        const r = await post<{ doc: FormatDoc; usage: Usage }>(`/api/format/${id}`, { note });
        await keepNote();
        setFormatId(id);
        setDoc(r.doc);
        setStage('doc');
        await recordRun({
          formatId: id,
          formatName: name,
          model: r.usage.model,
          inputTokens: r.usage.inputTokens,
          outputTokens: r.usage.outputTokens,
          ms: Date.now() - started,
        });
      }
      setTook(Date.now() - started);
      void clearDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function render() {
    setBusyId('render');
    setError(null);
    try {
      const isDoc = stage === 'doc';
      const url = isDoc ? `/api/deck/format/${formatId}` : '/api/deck';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDoc ? { doc } : { outline }),
      });
      if (!res.ok) throw new Error(await errorFrom(res));

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filenameFrom(res) ?? 'virtus.pptx';
      a.click();
      URL.revokeObjectURL(href);

      const now = Date.now();
      await db.artefacts.put({
        id: newId(),
        ownerId: ownerId(),
        noteId: noteId ?? '',
        kind: isDoc ? 'format' : 'deck',
        formatId: formatId ?? undefined,
        title: isDoc ? doc!.title : outline!.title,
        outline: isDoc ? undefined : outline!,
        doc: isDoc ? doc! : undefined,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The file could not be made.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      {stage === 'capture' && (
        <section className="mx-auto w-full max-w-3xl px-6 py-12">
          <header className="mb-7">
            <h1 className="text-2xl font-light tracking-tight text-ink">Virtus</h1>
            <p className="mt-1 text-sm text-ink/55">
              Put the mess in. Choose what it should become. Fix it before anything is made.
            </p>
          </header>

          <Capture text={note} onChange={setNote} disabled={busyId !== null} />

          <div className="mt-8">
            <FormatPicker
              formats={CHOICES}
              onPick={pick}
              disabled={busyId !== null}
              busyId={busyId}
            />
          </div>
        </section>
      )}

      {stage === 'doc' && format && doc && (
        <DocEditor
          format={format}
          doc={doc}
          onChange={setDoc}
          onRender={render}
          busy={busyId !== null}
          onBack={() => setStage('capture')}
        />
      )}

      {stage === 'outline' && outline && (
        <>
          <OutlineEditor
            outline={outline}
            onChange={setOutline}
            onRender={render}
            busy={busyId !== null}
            onBack={() => setStage('capture')}
          />
          {structure && <WhatYouSaid structure={structure} />}
        </>
      )}

      {error && (
        <p className="mx-auto max-w-3xl px-6 pb-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Footer took={took} />
    </main>
  );
}

/** Nothing invented (§8.5): the note as Virtus read it, beside what it made. */
function WhatYouSaid({ structure }: { structure: Structure }) {
  return (
    <details className="mx-auto max-w-3xl px-6 pb-10">
      <summary className="cursor-pointer text-xs text-ink/45 hover:text-accent">
        What Virtus read in your note
      </summary>
      <div className="mt-3 space-y-3 rounded-lg border border-rule bg-white px-4 py-4 text-sm">
        <Row label="Points" items={structure.points} />
        <Row label="Left open" items={structure.questions} />
        {structure.next && <Row label="Next" items={[structure.next]} />}
        <Row label="Named" items={structure.mentions} />
      </div>
    </details>
  );
}

function Row({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p>
      <ul className="mt-1 space-y-0.5 text-ink/80">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Footer({ took }: { took: number | null }) {
  const [where, setWhere] = useState<{ provider: string; models: string[] } | null>(null);
  useEffect(() => {
    fetch('/api/where')
      .then((r) => (r.ok ? r.json() : null))
      .then(setWhere)
      .catch(() => {});
  }, []);
  return (
    <footer className="mx-auto max-w-3xl px-6 pb-10 text-[11px] text-ink/35">
      Virtus {process.env.NEXT_PUBLIC_VIRTUS_VERSION}
      {took !== null && ` · read in ${(took / 1000).toFixed(1)}s`}
      {where && ` · sent to ${where.models.join(', ')} via ${where.provider}`}
      {' · nothing is shared; everything stays on this device · '}
      <a href="/case" className="underline underline-offset-2 hover:text-accent">
        what it costs
      </a>
    </footer>
  );
}

interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorFrom(res));
  return (await res.json()) as T;
}

/**
 * A corporate proxy returns HTML on a 403 (lesson 12.7). A block page is
 * indistinguishable from a permission refusal unless you check the body.
 */
async function errorFrom(res: Response): Promise<string> {
  const text = await res.text();
  if (/^\s*</.test(text)) {
    return 'Your network blocked this request — it returned a web page rather than an answer.';
  }
  try {
    const json = JSON.parse(text) as { error?: string };
    return json.error ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

function filenameFrom(res: Response): string | null {
  return res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? null;
}
