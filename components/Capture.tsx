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
        placeholder="Notes from the meeting, the stand-up or the call. Out of order is fine — what was said, what is blocked, what was committed."
        rows={9}
        className="w-full resize-none rounded border border-line bg-white px-4 py-3 text-[14px] leading-relaxed text-ink outline-none transition placeholder:text-ink40 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
      />
      <p className="mt-2 text-[12px] text-ink40">
        {restored && text ? 'Restored from your last session. ' : ''}
        Dictation is quicker than typing: <Key>Windows</Key> + <Key>H</Key>, or the microphone key
        on a Mac or phone keyboard.
      </p>
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-canvas px-1.5 py-px font-sans text-[10px] text-ink60">
      {children}
    </kbd>
  );
}
