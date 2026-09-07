'use client';

import { useEffect, useRef, useState } from 'react';
import { loadDraft, queueDraftSave } from '@/lib/drafts';

/**
 * One box that saves as you type (§13.1).
 *
 * No login, no folders, no formatting, no title field. Anything between having
 * a thought and the thought being in the box is the enemy (§8.1).
 *
 * There is deliberately no microphone (lesson 12.1). biblio built one on the
 * browser's speech API and removed it after a week: it commits each word as it
 * is spoken, so names break and punctuation never arrives. The device's own
 * dictation hears a whole sentence before deciding any word in it. So Virtus
 * says which key to press and does not offer a worse button beside it, because
 * the easier path is the one people take and then judge the product by.
 */
export function Capture({
  text,
  onChange,
  disabled,
}: {
  text: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [restored, setRestored] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadDraft().then((d) => {
      if (d?.text) {
        onChange(d.text);
        setRestored(true);
      }
      box.current?.focus();
    });
    // Once, on arrival. A draft restored twice would overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <textarea
        ref={box}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          queueDraftSave(e.target.value);
        }}
        placeholder="After the steerco, the stand-up, the call you did not want to take — what was said, what is stuck, what you promised."
        rows={10}
        className="w-full resize-none rounded-lg border border-rule bg-white px-5 py-4 text-[15px] leading-relaxed text-ink outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:opacity-60"
      />
      <p className="mt-2 text-xs text-ink/45">
        {restored && text ? 'Picked up where you left off. ' : ''}
        Dictating is faster: <Key>Windows</Key> + <Key>H</Key>, the mic key on a Mac keyboard, or
        the mic on your phone&rsquo;s keyboard.
      </p>
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-rule bg-white px-1 py-px font-sans text-[10px] text-ink/70">
      {children}
    </kbd>
  );
}
