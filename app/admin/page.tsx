'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TemplateBuilder, blankTemplate } from '@/components/admin/TemplateBuilder';
import { TemplatePreview } from '@/components/TemplatePreview';
import { allTemplates, removeTemplate, saveTemplate, setSettings } from '@/lib/admin/store';
import { BroadcastStrip } from '@/components/BroadcastStrip';
import { EMPTY, TONES, isShowing, savedMessage, type Banner } from '@/lib/admin/banner';
import { useSettings } from '@/lib/admin/use';
import type { CustomTemplate } from '@/lib/db';
import { FormatDefSchema } from '@/lib/formats/def-schema';
import { FORMATS } from '@/lib/formats/registry';
import type { FormatDef } from '@/lib/formats/types';
import { friendly } from '@/lib/friendly';
import type { House } from '@/lib/house';

/**
 * The admin space.
 *
 * Four things, and they are four because they are the four a team needs before
 * this stops being a demonstration: templates of its own, its own colours, a way
 * to say something to everyone using it, and the organisation model.
 *
 * All of it is on this device, and the screen says so rather than letting
 * somebody discover it. The 26 templates that ship are part of the application
 * and are on every device that opens the URL; a template built here is not.
 * That is a real limitation with a real end state (a shared store, §7), and the
 * export button is the stopgap that is honest about being one.
 */
type Tab = 'templates' | 'broadcast' | 'house' | 'organisation';

const TABS: { id: Tab; label: string }[] = [
  { id: 'templates', label: 'Templates' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'house', label: 'House style' },
  { id: 'organisation', label: 'Organisation' },
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-9">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">Admin</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink60">
        Templates, appearance and what everyone using this sees. Everything here is held on this
        device — the templates that ship with Virtus are on every device; the ones built here stay
        in this browser until there is a shared store.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-[13px] font-medium transition ${
              tab === t.id
                ? 'border-accent text-ink'
                : 'border-transparent text-ink60 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'templates' && <Templates />}
        {tab === 'broadcast' && <Broadcast />}
        {tab === 'house' && <HouseStyle />}
        {tab === 'organisation' && <Organisation />}
      </div>
    </main>
  );
}

function Templates() {
  const [rows, setRows] = useState<CustomTemplate[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; def: FormatDef } | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    void allTemplates().then(setRows);
  }, []);
  useEffect(load, [load]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await saveTemplate(editing.def, editing.id);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  /**
   * Import, validated in the file picker.
   *
   * A template that fails here fails with a sentence about what is wrong with
   * it. The alternative is that it fails three screens later, inside a prompt,
   * as a document that comes out empty.
   */
  async function importFile(chosen: File) {
    setProblem(null);
    try {
      const parsed = FormatDefSchema.safeParse(JSON.parse(await chosen.text()));
      if (!parsed.success) {
        setProblem(`That file is not a usable template: ${parsed.error.issues[0]?.message}`);
        return;
      }
      if (FORMATS.some((f) => f.id === parsed.data.id)) {
        setProblem(
          `A template that ships with Virtus already uses the id "${parsed.data.id}". Rename it before importing.`,
        );
        return;
      }
      await saveTemplate(parsed.data as FormatDef);
      load();
    } catch (err) {
      setProblem(friendly(err).message);
    }
  }

  if (editing) {
    return (
      <TemplateBuilder
        def={editing.def}
        onChange={(def) => setEditing({ ...editing, def })}
        onSave={save}
        onCancel={() => setEditing(null)}
        saving={saving}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing({ def: blankTemplate() })}
          className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark"
        >
          New template
        </button>
        <button
          type="button"
          onClick={() => file.current?.click()}
          className="rounded border border-line bg-paper px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-accent hover:text-accent"
        >
          Import a file
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            e.target.value = '';
            if (chosen) void importFile(chosen);
          }}
        />
        <p className="text-[12px] text-ink40">
          {rows?.length ?? 0} built here · {FORMATS.length} ship with Virtus
        </p>
      </div>

      {problem && <p className="mt-3 text-[13px] text-red-700">{problem}</p>}

      {rows?.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink40">
          No templates built here yet. A new one starts from a name, a line about who reads it, and
          a list of sections — the engine writes the prompt, the editing screen and all three
          outputs from that.
        </p>
      )}

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {rows?.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-paper shadow-card">
            <div className="h-[104px] overflow-hidden border-b border-lineSoft bg-white">
              <TemplatePreview format={row.def} />
            </div>
            <div className="px-4 py-3">
              <p className="text-[14px] font-medium text-ink">{row.def.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink60">
                {row.def.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ id: row.id, def: row.def })}
                  className="rounded border border-line px-2.5 py-1 text-[12px] text-ink60 transition hover:border-accent hover:text-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => download(row.def)}
                  className="rounded border border-line px-2.5 py-1 text-[12px] text-ink60 transition hover:border-accent hover:text-accent"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await removeTemplate(row.id);
                    load();
                  }}
                  className="ml-auto text-[12px] text-ink40 transition hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A template as a file, so it can reach a device this browser cannot. */
function download(def: FormatDef) {
  const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${def.id || 'template'}.virtus-template.json`;
  a.click();
  URL.revokeObjectURL(href);
}

/**
 * The broadcast strip, set here.
 *
 * The buttons say what they will do rather than showing a flag to be toggled.
 * The version this replaces put a button reading "Hidden" in a row beside three
 * tone chips, where it read as a fourth chip and as a status label rather than
 * a control — so the ordinary path (type a message, press Save) stored it
 * switched off, showed nothing, and said "Saved. It is at the top of the page."
 *
 * Every part of that was avoidable, and the general lesson is worth more than
 * the fix: a state flag beside things that are not state flags will be read as
 * one of them, and a confirmation that does not read the state it is confirming
 * will eventually lie.
 */
function Broadcast() {
  const { settings, reload } = useSettings();
  const [draft, setDraft] = useState<Banner>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const live = settings?.banner;

  useEffect(() => {
    if (settings !== undefined && !loaded) {
      setDraft(settings.banner ?? EMPTY);
      setLoaded(true);
    }
  }, [settings, loaded]);

  const edit = (part: Partial<Banner>) => {
    setDraft((d) => ({ ...d, ...part }));
    setSaid(null);
  };

  async function commit(on: boolean) {
    const next = { ...draft, on };
    setDraft(next);
    await setSettings({ banner: next });
    setSaid(savedMessage(next));
    reload();
  }

  const empty = !draft.text.trim();

  return (
    <div className="max-w-2xl">
      <p className="text-[13px] leading-relaxed text-ink60">
        A strip across the top of every screen. For things that are true right now and will not be
        true forever — a trial, an outage, a change freeze.
      </p>
      <p className="mt-2 rounded border border-line bg-lineSoft px-3 py-2 text-[12px] leading-relaxed text-ink60">
        This is not the classification line. That one says what may be entered into this deployment,
        it is set by whoever deployed it, and it deliberately cannot be edited here — a control the
        people bound by it can switch off is not a control.
      </p>

      <label className="mt-5 block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          Message
        </span>
        <textarea
          value={draft.text}
          rows={2}
          onChange={(e) => edit({ text: e.target.value })}
          placeholder="Trial run — do not enter confidential data."
          className="mt-1.5 w-full resize-y rounded border border-line px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </label>

      <div className="mt-3">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          How it should read
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => edit({ tone: tone.id })}
              className={`rounded border px-2.5 py-1 text-xs transition ${
                draft.tone === tone.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-line text-ink60 hover:border-accent'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      {/* The real strip, not something like it. */}
      <div className="mt-5">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink40">
          What people will see
        </span>
        <div className="mt-1.5">
          {empty ? (
            <p className="rounded border border-dashed border-line px-3 py-2.5 text-[12.5px] text-ink40">
              Nothing yet — write a message above.
            </p>
          ) : (
            <BroadcastStrip banner={draft} inset />
          )}
        </div>
      </div>

      {/* The buttons say what pressing them does. There is no flag to find. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isShowing(live) ? (
          <>
            <button
              type="button"
              disabled={empty}
              onClick={() => void commit(true)}
              className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => void commit(false)}
              className="text-[13px] text-ink60 transition hover:text-red-700"
            >
              Stop showing it
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={empty}
              onClick={() => void commit(true)}
              className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
            >
              Show this banner
            </button>
            <button
              type="button"
              disabled={empty}
              onClick={() => void commit(false)}
              className="text-[13px] text-ink60 transition hover:text-ink disabled:opacity-40"
            >
              Save without showing
            </button>
          </>
        )}
      </div>

      {said && <p className="mt-3 text-[12px] text-ink60">{said}</p>}
    </div>
  );
}


function HouseStyle() {
  const { settings, reload } = useSettings();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const house = settings?.house;

  async function upload(chosen: File) {
    setBusy(true);
    setProblem(null);
    try {
      const form = new FormData();
      form.append('file', chosen);
      const res = await fetch('/api/house', { method: 'POST', body: form });
      const body = (await res.json()) as { house?: House; error?: string };
      if (!res.ok || !body.house) {
        setProblem(body.error ?? 'That file could not be read.');
        return;
      }
      await setSettings({ house: body.house });
      reload();
    } catch (err) {
      setProblem(friendly(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[13px] leading-relaxed text-ink60">
        Upload a PowerPoint or Word file your firm already uses and every document Virtus produces
        adopts its colours and typefaces. Nothing about the file is kept — the theme is read out of
        it and the file itself is not stored.
      </p>
      <p className="mt-2 rounded border border-line bg-lineSoft px-3 py-2 text-[12px] leading-relaxed text-ink60">
        It reads the theme: six accent colours and two typefaces. It does not read layouts, masters
        or logos. A theme is small and precisely specified; a layout is not, and claiming to import
        somebody&rsquo;s template and producing a near miss would be worse than not offering it.
        Status colours stay as they are — a firm whose brand colour is red does not get to make
        &ldquo;Delayed&rdquo; look calm.
      </p>

      {house && (
        <div className="mt-5 rounded-lg border border-line bg-paper p-4 shadow-card">
          <p className="text-[12px] text-ink40">Read from {house.from}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {house.series.map((colour, i) => (
              <span
                key={i}
                title={`#${colour}`}
                className="h-8 w-8 rounded border border-line"
                style={{ background: `#${colour}` }}
              />
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink80" style={{ fontFamily: house.faceHeading }}>
            Headings in {house.faceHeading}
          </p>
          <p className="text-[13px] text-ink60" style={{ fontFamily: house.face }}>
            Body in {house.face}
          </p>
          <button
            type="button"
            onClick={async () => {
              await setSettings({ house: undefined });
              reload();
            }}
            className="mt-3 text-[12px] text-ink40 transition hover:text-red-700"
          >
            Remove and go back to the built-in style
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => file.current?.click()}
          className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-40"
        >
          {busy ? 'Reading…' : house ? 'Replace it' : 'Upload a template file'}
        </button>
        <input
          ref={file}
          type="file"
          accept=".pptx,.potx,.docx,.dotx"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            e.target.value = '';
            if (chosen) void upload(chosen);
          }}
        />
        <span className="text-[12px] text-ink40">.pptx, .potx, .docx or .dotx</span>
      </div>

      {problem && <p className="mt-3 text-[13px] text-red-700">{problem}</p>}
    </div>
  );
}

function Organisation() {
  return (
    <div className="max-w-2xl">
      <p className="text-[13px] leading-relaxed text-ink60">
        The people, clients, systems and terminology this organisation uses. Every document is
        written with it in front of the model — it is the difference between generic output and
        output that is already yours, and it is the part that keeps its value however good the
        models get.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink60">
        It is edited on its own screen rather than buried in here, because most entries arrive by
        being offered under a finished document at the moment the reason is obvious — not by
        somebody sitting down to fill in a form.
      </p>
      <Link
        href="/organisation"
        className="mt-5 inline-block rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark"
      >
        Open the organisation model
      </Link>
    </div>
  );
}
