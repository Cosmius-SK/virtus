'use client';

import { useState } from 'react';
import { Capture } from '@/components/Capture';
import { Compose, type Proposal, type Turn } from '@/components/Compose';
import { DocEditor } from '@/components/DocEditor';
import { OutlineEditor } from '@/components/OutlineEditor';
import { Problem } from '@/components/Problem';
import { TeachIt } from '@/components/TeachIt';
import { TemplateStore } from '@/components/TemplateStore';
import { Working } from '@/components/Working';
import { db, newId } from '@/lib/db';
import { clearDraft } from '@/lib/drafts';
import { formatById } from '@/lib/formats/registry';
import type { FormatDef, FormatDoc } from '@/lib/formats/types';
import { friendly, type Friendly } from '@/lib/friendly';
import { recordRun } from '@/lib/meter';
import { fixNames } from '@/lib/names';
import { unknownNames, type Notice } from '@/lib/org/notice';
import { add, all, context } from '@/lib/org/store';
import type { EntryKind } from '@/lib/org/types';
import { ownerId } from '@/lib/owner';
import type { Outline, Structure } from '@/lib/types';

type Stage = 'compose' | 'doc' | 'outline';
type Mode = 'templates' | 'freeform';

export default function Page() {
  const [stage, setStage] = useState<Stage>('compose');
  const [mode, setMode] = useState<Mode>('templates');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<Friendly | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const [formatId, setFormatId] = useState<string | null>(null);
  const [doc, setDoc] = useState<FormatDoc | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [lastPick, setLastPick] = useState<string | null>(null);

  const format = formatId ? formatById(formatId) : undefined;

  async function keepNote(text: string, structure?: Structure): Promise<string> {
    const id = newId();
    const now = Date.now();
    await db.notes.put({ id, ownerId: ownerId(), text, structure, createdAt: now, updatedAt: now });
    setNoteId(id);
    return id;
  }

  /** The reading pass, shared by both modes. */
  async function build(id: string, source: string, label: string) {
    setBusyId(id);
    setLastPick(id);
    setProblem(null);
    const started = Date.now();
    try {
      const known = await all();
      const org = await context();
      // Names are put back before the model reads it; the box is left as typed.
      const corrected = fixNames(source, known.map((e) => e.name));

      const r = await post<{ doc: FormatDoc; usage: Usage }>(`/api/format/${id}`, {
        note: corrected,
        org,
      });
      await keepNote(source);
      setFormatId(id);
      setDoc(r.doc);
      setStage('doc');
      setNotices(unknownNames(source, known));
      void clearDraft();
      await recordRun({
        formatId: id,
        formatName: label,
        model: r.usage.model,
        inputTokens: r.usage.inputTokens,
        outputTokens: r.usage.outputTokens,
        ms: Date.now() - started,
      });
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setBusyId(null);
    }
  }

  /**
   * The custom deck keeps its own path: an argument approved as an outline
   * before any slide exists (§6). No template fits a deck whose shape is the
   * decision being made, so it is offered beside the store rather than in it.
   */
  async function buildDeck() {
    if (note.trim().length < 20) {
      setProblem({ message: 'Add a few sentences about what happened first.', retry: false });
      return;
    }
    setBusyId('deck');
    setLastPick('deck');
    setProblem(null);
    const started = Date.now();
    try {
      const known = await all();
      const corrected = fixNames(note, known.map((e) => e.name));
      const s = await post<{ structure: Structure; usage: Usage }>('/api/structure', {
        note: corrected,
      });
      const o = await post<{ outline: Outline; usage: Usage }>('/api/outline', {
        structure: s.structure,
        ask: '',
      });
      await keepNote(note, s.structure);
      setStructure(s.structure);
      setOutline(o.outline);
      setStage('outline');
      setNotices(unknownNames(note, known));
      void clearDraft();
      await recordRun({
        formatId: 'deck',
        formatName: 'Custom deck',
        model: s.usage.model,
        inputTokens: s.usage.inputTokens + o.usage.inputTokens,
        outputTokens: s.usage.outputTokens + o.usage.outputTokens,
        ms: Date.now() - started,
      });
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setBusyId(null);
    }
  }

  function chooseTemplate(chosen: FormatDef) {
    if (note.trim().length < 20) {
      setProblem({
        message: 'Add a few sentences about what happened before choosing a template.',
        retry: false,
      });
      return;
    }
    void build(chosen.id, note, chosen.name);
  }

  async function sendTurn(text: string) {
    const next: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(next);
    setProposal(null);
    setBusyId('compose');
    setProblem(null);
    try {
      const org = await context();
      const r = await post<{ reply: string; ready: boolean; proposal: Proposal | null }>(
        '/api/compose',
        { messages: next, org },
      );
      setTurns([...next, { role: 'assistant', content: r.reply }]);
      setProposal(r.ready ? r.proposal : null);
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setBusyId(null);
    }
  }

  function acceptProposal(accepted: Proposal) {
    // Everything the person said, in order, is the note. The conversation was
    // how it was gathered, not a separate thing to summarise.
    const said = turns.filter((t) => t.role === 'user').map((t) => t.content).join('\n\n');
    void build(accepted.formatId, said, accepted.formatName);
  }

  async function render(as: 'pptx' | 'docx' | 'pdf' = 'pptx') {
    setBusyId('render');
    setProblem(null);
    try {
      const isDoc = stage === 'doc';
      const url = isDoc
        ? as === 'docx'
          ? `/api/doc/format/${formatId}`
          : as === 'pdf'
            ? `/api/pdf/format/${formatId}`
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

  function startOver() {
    setStage('compose');
    setProposal(null);
  }

  if (stage === 'doc' && format && doc) {
    return (
      <>
        <DocEditor
          format={format}
          doc={doc}
          onChange={setDoc}
          onRender={render}
          busy={busyId !== null}
          onBack={startOver}
        />
        {notices.length > 0 && (
          <div className="mx-auto max-w-3xl px-6 pb-8">
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
        {problem && (
          <div className="mx-auto max-w-3xl px-6 pb-8">
            <Problem problem={problem} onRetry={() => render()} />
          </div>
        )}
      </>
    );
  }

  if (stage === 'outline' && outline) {
    return (
      <>
        <OutlineEditor
          outline={outline}
          onChange={setOutline}
          onRender={() => render()}
          busy={busyId !== null}
          onBack={startOver}
        />
        {structure && <Extracted structure={structure} />}
        {problem && (
          <div className="mx-auto max-w-3xl px-6 pb-8">
            <Problem problem={problem} onRetry={() => render()} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-9">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">New document</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink60">
          Provide the detail once. Virtus extracts the facts, shows them for review, and produces
          the document only when you are satisfied — as slides, Word or PDF.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-lg border border-line bg-paper p-1 shadow-card">
        {(
          [
            ['templates', 'From a template'],
            ['freeform', 'Free-form'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded px-4 py-1.5 text-[13px] font-medium transition ${
              mode === id ? 'bg-ink text-white' : 'text-ink60 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'templates' ? (
        <>
          <div className="mb-6 rounded-lg border border-line bg-paper p-5 shadow-card">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
              What happened
            </label>
            <Capture text={note} onChange={setNote} disabled={busyId !== null} />
          </div>

          {busyId && busyId !== 'render' && (
            <div className="mb-6">
              <Working what={formatById(busyId)?.name ?? 'your document'} />
            </div>
          )}
          {problem && (
            <div className="mb-6">
              <Problem
                problem={problem}
                onRetry={() => lastPick && note && build(lastPick, note, lastPick)}
              />
            </div>
          )}

          <button
            type="button"
            disabled={busyId !== null}
            onClick={buildDeck}
            className="group mb-8 flex w-full items-center gap-4 rounded-lg border border-line bg-paper p-4 text-left shadow-card transition hover:border-accent hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-accentTint text-accentDark">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4" width="18" height="12" rx="1.5" />
                <path d="M7 20h10M12 16v4" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink group-hover:text-accent">
                {busyId === 'deck' ? 'Building the argument…' : 'Custom deck'}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink60">
                No fixed template. Virtus proposes the argument as an editable outline — reorder,
                cut and merge — and draws the slides only from what you approve.
              </span>
            </span>
            <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink40">
              Slides
            </span>
          </button>

          <TemplateStore onSelect={chooseTemplate} disabled={busyId !== null} busyId={busyId} />
        </>
      ) : (
        <div className="max-w-3xl">
          <Compose
            turns={turns}
            proposal={proposal}
            thinking={busyId === 'compose'}
            onSend={sendTurn}
            onAccept={acceptProposal}
            disabled={busyId !== null}
          />
          {busyId && busyId !== 'compose' && (
            <div className="mt-5">
              <Working what={formatById(busyId)?.name ?? 'your document'} />
            </div>
          )}
          {problem && (
            <div className="mt-5">
              <Problem problem={problem} onRetry={() => setProblem(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * What was read out of the input, shown beside what was made from it.
 *
 * Rule 4 is only credible if it can be checked. A claim with no root in the
 * note is visible here rather than merely plausible on the slide.
 */
function Extracted({ structure }: { structure: Structure }) {
  const rows: [string, string[]][] = [
    ['Points made', structure.points],
    ['Left open', structure.questions],
    ...(structure.next ? ([['Next step', [structure.next]]] as [string, string[]][]) : []),
    ['Named', structure.mentions],
  ];
  return (
    <details className="mx-auto max-w-3xl px-6 pb-10">
      <summary className="cursor-pointer text-[12px] text-ink40 transition hover:text-accent">
        What Virtus extracted from your input
      </summary>
      <div className="mt-3 space-y-4 rounded-lg border border-line bg-paper px-5 py-4 shadow-card">
        {rows.map(([label, items]) =>
          items.length ? (
            <div key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                {label}
              </p>
              <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-ink80">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </details>
  );
}

interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Bounded: a request that never returns leaves nothing to say to the room. */
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
    return (JSON.parse(text) as { error?: string }).error ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

function filenameFrom(res: Response): string | null {
  return res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? null;
}
