'use client';

import { useEffect, useState } from 'react';
import { Capture } from '@/components/Capture';
import { DocEditor } from '@/components/DocEditor';
import { FormatPicker, type FormatSummary } from '@/components/FormatPicker';
import { OutlineEditor } from '@/components/OutlineEditor';
import { db, newId } from '@/lib/db';
import { FORMATS, formatById } from '@/lib/formats/registry';
import type { FormatDoc } from '@/lib/formats/types';
import { Problem } from '@/components/Problem';
import { Working } from '@/components/Working';
import { clearDraft } from '@/lib/drafts';
import { TeachIt } from '@/components/TeachIt';
import { friendly, type Friendly } from '@/lib/friendly';
import { fixNames } from '@/lib/names';
import { unknownNames, type Notice } from '@/lib/org/notice';
import { add, all, context } from '@/lib/org/store';
import type { EntryKind } from '@/lib/org/types';
import { SAMPLES } from '@/lib/samples';
import { recordRun } from '@/lib/meter';
import { ownerId } from '@/lib/owner';
import type { Outline, Structure } from '@/lib/types';

/** The multi-slide deck is not a one-pager format, so it sits beside them. */
const DECK: FormatSummary = {
  id: 'deck',
  name: 'Full deck',
  description: 'Several slides — the argument first, as an outline you approve before anything is drawn.',
  outputs: ['pptx'],
};

const CHOICES: FormatSummary[] = [
  ...FORMATS.map(({ id, name, description, outputs }) => ({ id, name, description, outputs })),
  DECK,
];

type Stage = 'capture' | 'doc' | 'outline';

export default function Page() {
  const [stage, setStage] = useState<Stage>('capture');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<Friendly | null>(null);

  const [formatId, setFormatId] = useState<string | null>(null);
  const [doc, setDoc] = useState<FormatDoc | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [took, setTook] = useState<number | null>(null);
  /** What to repeat when someone presses Try again. */
  const [lastPick, setLastPick] = useState<string | null>(null);
  /** Names the note used that Virtus does not know yet (§3). */
  const [notices, setNotices] = useState<Notice[]>([]);

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
      setProblem({ message: 'Put a few sentences in the box first.', retry: false });
      return;
    }
    setBusyId(id);
    setLastPick(id);
    setProblem(null);
    const started = Date.now();
    try {
      const name = CHOICES.find((c) => c.id === id)?.name ?? id;
      const known = await all();
      const org = await context();

      // What goes to the model has the names put back (lesson 12.1). The box is
      // left exactly as typed — correcting what someone can see themselves is
      // presumptuous; correcting what the model sees is the whole point.
      const corrected = fixNames(note, known.map((e) => e.name));

      if (id === 'deck') {
        const s = await post<{ structure: Structure; usage: Usage }>('/api/structure', {
          note: corrected,
        });
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
        const r = await post<{ doc: FormatDoc; usage: Usage }>(`/api/format/${id}`, {
          note: corrected,
          org,
        });
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
      setNotices(unknownNames(note, known));
      void clearDraft();
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setBusyId(null);
    }
  }

  async function render(as: 'pptx' | 'docx' = 'pptx') {
    setBusyId('render');
    setProblem(null);
    try {
      const isDoc = stage === 'doc';
      const url = isDoc
        ? as === 'docx'
          ? `/api/doc/format/${formatId}`
          : `/api/deck/format/${formatId}`
        : '/api/deck';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDoc ? { doc } : { outline }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(await errorFrom(res));

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filenameFrom(res) ?? `virtus.${as}`;
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
      setProblem(friendly(err));
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

          {!note.trim() && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink/40">Or try one:</span>
              {SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setNote(sample.note)}
                  className="rounded-full border border-rule bg-white px-3 py-1 text-xs text-ink/70 transition hover:border-accent hover:text-accent"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          )}

          {busyId && (
            <div className="mt-6">
              <Working what={CHOICES.find((c) => c.id === busyId)?.name ?? 'your document'} />
            </div>
          )}

          {problem && (
            <div className="mt-6">
              <Problem problem={problem} onRetry={() => busyId === null && lastPick && pick(lastPick)} />
            </div>
          )}

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


      {(stage === 'doc' || stage === 'outline') && notices.length > 0 && (
        <div className="mx-auto max-w-3xl px-6 pb-2">
          <TeachIt
            notices={notices}
            onTeach={async (name: string, kind: EntryKind) => {
              await add(kind, name, '');
              setNotices((n) => n.filter((x) => x.name !== name));
            }}
            onDismiss={(name: string) => setNotices((n) => n.filter((x) => x.name !== name))}
          />
        </div>
      )}

      {problem && stage !== 'capture' && (
        <div className="mx-auto max-w-3xl px-6 pb-6">
          <Problem problem={problem} onRetry={() => render()} />
        </div>
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
      <a href="/organisation" className="underline underline-offset-2 hover:text-accent">
        what it knows
      </a>
      {' · '}
      <a href="/library" className="underline underline-offset-2 hover:text-accent">
        what you have made
      </a>
      {' · '}
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

/**
 * Bounded, because a request that never returns is worse than one that fails —
 * there is nothing to say to the room while a spinner turns forever.
 */
const TIMEOUT_MS = 90_000;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
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
