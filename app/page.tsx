'use client';

import { useEffect, useState } from 'react';
import { Capture, type Format } from '@/components/Capture';
import { OutlineEditor } from '@/components/OutlineEditor';
import { WsrEditor } from '@/components/WsrEditor';
import { db, newId } from '@/lib/db';
import { ownerId } from '@/lib/owner';
import type { Outline, Structure, Wsr } from '@/lib/types';

type Stage = 'capture' | 'outline' | 'wsr';

/**
 * Day one, end to end (§13): a note, one pass returning structure, the argument
 * as an editable list, and a real .pptx.
 *
 * Every step below is a call to an endpoint that works without a browser (§7).
 * The web app is the first caller, not the owner — when the plugin arrives it
 * calls these same three and needs no pipeline of its own.
 */
export default function Page() {
  const [stage, setStage] = useState<Stage>('capture');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [wsr, setWsr] = useState<Wsr | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  /** Keep the note whatever format was asked for — it is private thinking (§4). */
  async function keepNote(note: string, structure?: Structure): Promise<string> {
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

  async function generate(note: string, format: Format) {
    setBusy(true);
    setError(null);
    try {
      if (format === 'wsr') {
        const w = await post<{ wsr: Wsr }>('/api/wsr', { note });
        await keepNote(note);
        setWsr(w.wsr);
        setStage('wsr');
        return;
      }

      const s = await post<{ structure: Structure }>('/api/structure', { note });
      const o = await post<{ outline: Outline }>('/api/outline', { structure: s.structure, ask: '' });
      await keepNote(note, s.structure);
      setStructure(s.structure);
      setOutline(o.outline);
      setStage('outline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something failed.');
    } finally {
      setBusy(false);
    }
  }

  async function render() {
    const wsrMode = stage === 'wsr';
    if (wsrMode ? !wsr : !outline) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(wsrMode ? '/api/deck/wsr' : '/api/deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wsrMode ? { wsr } : { outline }),
      });
      if (!res.ok) throw new Error(await errorFrom(res));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFrom(res) ?? 'deck.pptx';
      a.click();
      URL.revokeObjectURL(url);

      // A finished artefact. Separate table, its own visibility (§4, §10).
      const now = Date.now();
      await db.artefacts.put({
        id: newId(),
        ownerId: ownerId(),
        noteId: noteId ?? '',
        kind: wsrMode ? 'wsr' : 'deck',
        title: wsrMode ? wsr!.title : outline!.title,
        outline: wsrMode ? undefined : outline!,
        wsr: wsrMode ? wsr! : undefined,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The deck could not be rendered.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      {stage === 'capture' ? (
        <Capture onGenerate={generate} busy={busy} />
      ) : stage === 'wsr' && wsr ? (
        <WsrEditor
          wsr={wsr}
          onChange={setWsr}
          onRender={render}
          busy={busy}
          onBack={() => setStage('capture')}
        />
      ) : outline ? (
        <>
          <OutlineEditor
            outline={outline}
            onChange={setOutline}
            onRender={render}
            busy={busy}
            onBack={() => setStage('capture')}
          />
          {structure && <WhatYouSaid structure={structure} />}
        </>
      ) : (
        <Capture onGenerate={generate} busy={busy} />
      )}

      {error && (
        <p className="mx-auto max-w-3xl px-6 pb-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Where />
    </main>
  );
}

/**
 * Nothing invented (§8.5). The note as Virtus read it, kept beside the outline
 * so a claim with no root in the note is visible rather than plausible.
 */
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

/** Virtus says where the text goes, plainly (§5). */
function Where() {
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
      {where && ` · notes are sent to ${where.models.join(', ')} via ${where.provider}`}
      {' · nothing is shared; everything stays on this device'}
    </footer>
  );
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
 * A corporate proxy returns HTML on a 403 (lesson 12.7). A Zscaler block page
 * is indistinguishable from a permission refusal unless you check the body.
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
  const match = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}
