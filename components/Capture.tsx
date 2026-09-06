'use client';

import { useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, queueDraftSave } from '@/lib/drafts';

/**
 * One screen: a box that saves as you type, and one button (§13.1).
 *
 * No login, no folders, no formatting, no title field. Anything between having
 * a thought and the thought being in the box is the enemy (§8.1).
 *
 * There is deliberately no microphone here (lesson 12.1). biblio built one on
 * the browser's speech API and removed it: a week of work that never closed the
 * gap. The device's own dictation hears a whole sentence before deciding any
 * word in it, punctuates natively, and is free — so Virtus says which key to
 * press and does not offer a worse button beside it, because the easier path is
 * the one people take and then judge the product by.
 */
export type Format = 'deck' | 'wsr';

export function Capture({
  onGenerate,
  busy,
}: {
  onGenerate: (note: string, format: Format) => void;
  busy: boolean;
}) {
  const [text, setText] = useState('');
  const [restored, setRestored] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadDraft().then((d) => {
      if (d) {
        setText(d.text);
        setRestored(true);
      }
      box.current?.focus();
    });
  }, []);

  function change(value: string) {
    setText(value);
    queueDraftSave(value);
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-14">
      <header className="mb-8">
        <h1 className="text-2xl font-light tracking-tight text-ink">Virtus</h1>
        <p className="mt-1 text-sm text-ink/55">
          Put the mess in. The argument comes back before anything is rendered.
        </p>
      </header>

      <textarea
        ref={box}
        value={text}
        onChange={(e) => change(e.target.value)}
        placeholder="After the steerco — what was said, what is stuck, what you promised."
        rows={12}
        className="w-full resize-none rounded-lg border border-rule bg-white px-5 py-4 text-[15px] leading-relaxed text-ink outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
      />

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-ink/45">
          {restored && text ? 'Picked up where you left off. ' : ''}
          Dictating is faster: <Key>Windows</Key> + <Key>H</Key>, the mic key on a Mac keyboard,
          or the mic on your phone&rsquo;s keyboard.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={busy || text.trim().length < 20}
            onClick={() => {
              void clearDraft();
              onGenerate(text, 'wsr');
            }}
            className="rounded-md border border-rule bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Weekly status
          </button>
          <button
            type="button"
            disabled={busy || text.trim().length < 20}
            onClick={() => {
              void clearDraft();
              onGenerate(text, 'deck');
            }}
            className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {busy ? 'Reading…' : 'Make a deck'}
          </button>
        </div>
      </div>
    </section>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-rule bg-white px-1 py-px font-sans text-[10px] text-ink/70">
      {children}
    </kbd>
  );
}
