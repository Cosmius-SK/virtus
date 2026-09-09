'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capture } from '@/components/Capture';
import { Compose, type Proposal, type Turn } from '@/components/Compose';
import { DocEditor } from '@/components/DocEditor';
import { OutlineEditor } from '@/components/OutlineEditor';
import { Problem } from '@/components/Problem';
import { TeachIt } from '@/components/TeachIt';
import { TemplateFill, noteFrom, type Filled } from '@/components/TemplateFill';
import { TemplateStore } from '@/components/TemplateStore';
import { Writing } from '@/components/Writing';
import { useSettings } from '@/lib/admin/use';
import { db, newId } from '@/lib/db';
import { clearDraft, discardDraft, savedDrafts, saveTemplateDraft } from '@/lib/drafts';
import type { Draft } from '@/lib/db';
import { findFormat, useFormats } from '@/lib/formats/all';
import type { FormatDef, FormatDoc } from '@/lib/formats/types';
import { friendly, type Friendly } from '@/lib/friendly';
import { recordRun } from '@/lib/meter';
import { fixNames } from '@/lib/names';
import { unknownNames, type Notice } from '@/lib/org/notice';
import { add, all, context } from '@/lib/org/store';
import type { EntryKind } from '@/lib/org/types';
import { ownerId } from '@/lib/owner';
import type { Outline, Structure } from '@/lib/types';

type Stage = 'compose' | 'fill' | 'deckNote' | 'doc' | 'outline';
type Mode = 'templates' | 'freeform';

export default function Page() {
  const { formats, custom } = useFormats();
  const { settings } = useSettings();
  const [stage, setStage] = useState<Stage>('compose');
  const [mode, setMode] = useState<Mode>('templates');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<Friendly | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const [chosen, setChosen] = useState<FormatDef | null>(null);
  const [filled, setFilled] = useState<Filled>({ parts: {}, extra: '' });
  /** What was actually sent to be read. Kept so a rewrite has the same source. */
  const [source, setSource] = useState('');
  const [rewriting, setRewriting] = useState<string | null>(null);
  /** What the slide does with a section longer than a page. Never silence. */
  const [overflow, setOverflow] = useState<'continue' | 'fit'>('continue');
  /** The draft this filling-in belongs to, so leaving does not lose it. */
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const loadDrafts = useCallback(() => {
    void savedDrafts().then(setDrafts);
  }, []);
  useEffect(loadDrafts, [loadDrafts]);

  // Saved at typing speed, a beat behind the keyboard. Anything typed into a
  // template is the only copy of thinking somebody has already done, and the
  // way it is lost is closing a tab, which gives no warning (§8.1).
  useEffect(() => {
    if (stage !== 'fill' || !chosen || !draftId) return;
    const timer = window.setTimeout(() => {
      void saveTemplateDraft({
        id: draftId,
        formatId: chosen.id,
        formatName: chosen.name,
        parts: filled.parts,
        extra: filled.extra,
      }).then(loadDrafts);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [stage, chosen, draftId, filled, loadDrafts]);

  const [formatId, setFormatId] = useState<string | null>(null);
  const [doc, setDoc] = useState<FormatDoc | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const format = formatId ? findFormat(formatId, custom) : undefined;

  // Every stage is a different screen, so it starts at the top of that screen.
  // Without this, choosing a template from halfway down the store lands you
  // halfway down the form — past the sentence explaining what the form is, which
  // is how a control on the screen after it came to be reported missing twice.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage]);

  async function keepNote(text: string, structure?: Structure): Promise<string> {
    const id = newId();
    const now = Date.now();
    await db.notes.put({ id, ownerId: ownerId(), text, structure, createdAt: now, updatedAt: now });
    setNoteId(id);
    return id;
  }

  /** The reading pass, shared by both modes. */
  async function build(id: string, text: string, label: string, guided = false) {
    // A custom template is not on the server, so it goes with the request. A
    // built-in one is ignored there, which is what stops a caller redefining it.
    const carried = custom.find((f) => f.id === id);
    setBusyId(id);
    setProblem(null);
    const started = Date.now();
    try {
      const known = await all();
      const org = await context();
      // Names are put back before the model reads it; the box is left as typed.
      const corrected = fixNames(text, known.map((e) => e.name));

      const r = await post<{ doc: FormatDoc; usage: Usage }>(`/api/format/${id}`, {
        note: corrected,
        org,
        guided,
        format: carried,
      });
      await keepNote(text);
      setSource(corrected);
      setFormatId(id);
      setDoc(r.doc);
      setStage('doc');
      setNotices(unknownNames(text, known));
      void clearDraft();
      // It became a document, so it has stopped being a draft.
      if (draftId) {
        void discardDraft(draftId).then(loadDrafts);
        setDraftId(null);
      }
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

  /**
   * Choosing a template opens it, rather than demanding a note first.
   *
   * The old order made people write before they knew what was wanted of them,
   * and the commonest thing that came back was a note missing whatever the
   * template needed most. The template knows what it needs; asking in its own
   * shape is cheaper for everyone than asking blind and reading around the gap.
   */
  function chooseTemplate(next: FormatDef) {
    if (chosen?.id !== next.id) {
      setFilled({ parts: {}, extra: '' });
      setDraftId(newId());
    } else if (!draftId) {
      setDraftId(newId());
    }
    setChosen(next);
    setProblem(null);
    setStage('fill');
  }

  /** Pick up where somebody left off, in the template they left off in. */
  function resume(draft: Draft) {
    const format = draft.formatId ? findFormat(draft.formatId, custom) : undefined;
    if (!format) return;
    setChosen(format);
    setFilled({ parts: draft.parts ?? {}, extra: draft.extra ?? '' });
    setDraftId(draft.id);
    setProblem(null);
    setStage('fill');
  }

  function generate() {
    if (!chosen) return;
    void build(chosen.id, noteFrom(chosen, filled), chosen.name, true);
  }

  /**
   * One section, rewritten from the same input. Everything else is untouched,
   * including corrections already made by hand (§6, rule 2).
   */
  async function rewriteSection(sectionId: string, instruction: string) {
    if (!formatId || !doc) return;
    setRewriting(sectionId);
    setProblem(null);
    const started = Date.now();
    try {
      const org = await context();
      const current = doc.sections[sectionId];
      const r = await post<{ value: FormatDoc['sections'][string]; usage: Usage }>(
        `/api/rewrite/${formatId}`,
        {
          sectionId,
          note: source,
          current: typeof current === 'string' ? current : JSON.stringify(current, null, 1),
          instruction,
          org,
          format: custom.find((f) => f.id === formatId),
        },
      );
      setDoc({ ...doc, sections: { ...doc.sections, [sectionId]: r.value } });
      await recordRun({
        formatId,
        formatName: `${format?.name ?? 'Document'} — one section`,
        model: r.usage.model,
        inputTokens: r.usage.inputTokens,
        outputTokens: r.usage.outputTokens,
        ms: Date.now() - started,
      });
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setRewriting(null);
    }
  }

  /** Every section again. Offered because it is sometimes right, and labelled
   * with what it costs: corrections already made are lost. */
  async function rewriteAll(instruction: string) {
    if (!formatId || !format) return;
    setRewriting('all');
    setProblem(null);
    const started = Date.now();
    try {
      const org = await context();
      const r = await post<{ doc: FormatDoc; usage: Usage }>(`/api/format/${formatId}`, {
        note: source,
        org,
        guided: true,
        instruction,
        format: custom.find((f) => f.id === formatId),
      });
      setDoc(r.doc);
      await recordRun({
        formatId,
        formatName: `${format.name} — rewritten`,
        model: r.usage.model,
        inputTokens: r.usage.inputTokens,
        outputTokens: r.usage.outputTokens,
        ms: Date.now() - started,
      });
    } catch (err) {
      setProblem(friendly(err));
    } finally {
      setRewriting(null);
    }
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
        { messages: next, org, templates: custom },
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
    const spoken = turns.filter((t) => t.role === 'user').map((t) => t.content).join('\n\n');
    void build(accepted.formatId, spoken, accepted.formatName);
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
        body: JSON.stringify(
          isDoc
            ? { doc, format: custom.find((f) => f.id === formatId), house: settings?.house, overflow }
            : { outline, house: settings?.house },
        ),
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

  if (stage === 'fill' && chosen) {
    return (
      <>
        <TemplateFill
          format={chosen}
          filled={filled}
          onChange={setFilled}
          onGenerate={generate}
          onBack={() => setStage('compose')}
          busy={busyId !== null}
        />
        {busyId && <Writing what={chosen.name} />}
        {problem && (
          <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
            <Problem problem={problem} onRetry={generate} />
          </div>
        )}
      </>
    );
  }

  if (stage === 'deckNote') {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-9">
        <button
          type="button"
          onClick={() => setStage('compose')}
          className="mb-5 text-[12px] text-ink40 transition hover:text-accent"
        >
          ← All templates
        </button>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">Custom deck</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink60">
          No template, so there are no boxes to fill — the shape of the deck is the argument, and
          that is what Virtus proposes. Write what happened and what you want the room to conclude.
        </p>
        <div className="mt-5 rounded-lg border border-line bg-paper p-5 shadow-card">
          <Capture text={note} onChange={setNote} disabled={busyId !== null} />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <p className="mr-auto text-[12px] text-ink40">
            You approve the outline before a single slide is drawn.
          </p>
          <button
            type="button"
            disabled={busyId !== null || note.trim().length < 20}
            onClick={buildDeck}
            className="rounded bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busyId === 'deck' ? 'Building the argument…' : 'Propose the argument'}
          </button>
        </div>
        {busyId === 'deck' && <Writing what="the argument" />}
        {problem && (
          <div className="mt-6">
            <Problem problem={problem} onRetry={buildDeck} />
          </div>
        )}
      </section>
    );
  }

  if (stage === 'doc' && format && doc) {
    return (
      <>
        <DocEditor
          format={format}
          doc={doc}
          onChange={setDoc}
          onRender={render}
          onRewriteSection={rewriteSection}
          onRewriteAll={rewriteAll}
          overflow={overflow}
          onOverflow={setOverflow}
          rewriting={rewriting}
          busy={busyId !== null || rewriting !== null}
          onBack={() => setStage(chosen ? 'fill' : 'compose')}
        />
        {notices.length > 0 && (
          <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
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
          <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
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
          <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
            <Problem problem={problem} onRetry={() => render()} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-9">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">New document</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink60">
          Choose a template and fill in what you know, or describe it in your own words and let
          Virtus propose one. It lays the content out for review, rewrites anything you want
          changed, and produces the file only when you are satisfied — slides, Word or PDF.
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
          {problem && (
            <div className="mb-6">
              <Problem problem={problem} onRetry={() => setProblem(null)} />
            </div>
          )}

          {drafts.length > 0 && (
            <section className="mb-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
                Picked up where you left off
              </p>
              <ul className="space-y-2">
                {drafts.map((draft) => (
                  <li
                    key={draft.id}
                    className="flex items-start gap-3 rounded-lg border border-line bg-paper px-4 py-3 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{draft.formatName}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink60">
                        {draft.text || 'Nothing written yet'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resume(draft)}
                        className="rounded border border-line px-2.5 py-1 text-[12px] text-ink60 transition hover:border-accent hover:text-accent"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await discardDraft(draft.id);
                          loadDrafts();
                        }}
                        className="text-[12px] text-ink40 transition hover:text-red-700"
                      >
                        Discard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink40">
                The last {drafts.length === 1 ? 'one' : drafts.length} you started and did not
                finish. Six are kept; the oldest drops off.
              </p>
            </section>
          )}

          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setStage('deckNote')}
            className="group mb-8 flex w-full items-start gap-3 rounded-lg border border-line bg-paper p-4 text-left shadow-card transition hover:border-accent hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50 sm:items-center sm:gap-4"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-accentTint text-accentDark">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4" width="18" height="12" rx="1.5" />
                <path d="M7 20h10M12 16v4" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink group-hover:text-accent">
                Custom deck
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink60">
                No fixed template. Virtus proposes the argument as an editable outline — reorder,
                cut and merge — and draws the slides only from what you approve.
              </span>
            </span>
            <span className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink40 sm:block">
              Slides
            </span>
          </button>

          <TemplateStore
            formats={formats}
            onSelect={chooseTemplate}
            disabled={busyId !== null}
            busyId={busyId}
          />
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
            <Writing what={findFormat(busyId, custom)?.name ?? 'your document'} />
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
    <details className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
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
