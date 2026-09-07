'use client';

import { useEffect, useRef, useState } from 'react';
import { Mark } from './Logo';

export interface Proposal {
  formatId: string;
  formatName: string;
  title: string;
  plan: string[];
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Free-form: describe the document, agree the plan, then it is built.
 *
 * The rule does not change because the surface is a conversation (§6, §8.2). It
 * proposes and waits. A chat that produced a finished deck from the first
 * sentence would be the thing this exists not to be — a generator whose output
 * has to be rewritten, which is most of the work.
 */
export function Compose({
  turns,
  proposal,
  thinking,
  onSend,
  onAccept,
  disabled,
}: {
  turns: Turn[];
  proposal: Proposal | null;
  thinking: boolean;
  onSend: (text: string) => void;
  onAccept: (proposal: Proposal) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, proposal, thinking]);

  function send() {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft('');
    onSend(text);
  }

  return (
    <div className="rounded-lg border border-line bg-paper shadow-card">
      <div className="max-h-[46vh] min-h-[220px] space-y-4 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="py-6 text-center">
            <Mark className="mx-auto h-9 w-9 text-accent/30 [--mark-vent:#fff]" />
            <p className="mt-3 text-[14px] text-ink80">
              Describe the document you need and what you know.
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-ink40">
              It will ask about substance rather than preferences, propose a template and a plan,
              and build only once you agree.
            </p>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                {turn.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <Mark className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="max-w-[85%] whitespace-pre-wrap text-[13px] leading-relaxed text-ink80">
                {turn.content}
              </p>
            </div>
          ),
        )}

        {thinking && (
          <div className="flex items-center gap-2.5 text-[13px] text-ink40">
            <Mark className="h-4 w-4 animate-pulse text-accent/50" />
            Thinking…
          </div>
        )}

        {proposal && !thinking && (
          <div className="rounded-lg border border-accent/30 bg-accentTint p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentDark">
              Proposed — {proposal.formatName}
            </p>
            <p className="mt-1.5 text-[15px] font-medium text-ink">{proposal.title}</p>
            <ul className="mt-2.5 space-y-1">
              {proposal.plan.map((line, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink80">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAccept(proposal)}
                className="rounded bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accentDark disabled:opacity-50"
              >
                Build this
              </button>
              <span className="text-[12px] text-ink60">
                or say what to change below — nothing is produced until you agree.
              </span>
            </div>
          </div>
        )}

        <div ref={end} />
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={
              turns.length === 0
                ? 'e.g. I need a status report for the DC consolidation programme. Waves 1 to 3 are done, Wave 4 is blocked on approvals…'
                : 'Reply, or say what to change'
            }
            className="min-h-[52px] flex-1 resize-none rounded border border-line bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-ink40 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={disabled || !draft.trim()}
            className="h-[52px] shrink-0 rounded bg-ink px-4 text-[13px] font-medium text-white transition hover:bg-ink80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-ink40">⌘/Ctrl + Enter to send</p>
      </div>
    </div>
  );
}
