import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BroadcastStrip } from '@/components/BroadcastStrip';
import {
  ARCHIVE,
  LIMIT,
  MAX_TEXT,
  active,
  archived,
  broadcastsOf,
  canAdd,
  live,
  mostSevere,
  phaseOf,
  problemWith,
  savedMessage,
  today,
  trim,
  type Broadcast,
} from '@/lib/admin/broadcast';

/**
 * The broadcast was reported as not displaying twice, and the second time it was
 * this: typing a message and pressing save stored it switched off, showed
 * nothing, and said "Saved. It is at the top of the page."
 *
 * The strip itself was fine both times. What hid the fault was a confirmation
 * that did not read the state it was confirming — so the person had no reason
 * to think the tool had misunderstood them, and the report came back as a
 * missing feature rather than a switch that did nothing.
 *
 * Dates and a list gave that sentence three more ways to be false, and the
 * internal note added a way to fail that is worse than any of them: a private
 * line about who asked for a notice, rendered to everybody.
 */

const T = '2026-09-11';

function make(part: Partial<Broadcast> = {}): Broadcast {
  return { id: 'a', text: 'Trial run', tone: 'info', on: true, addedAt: 1, ...part };
}

describe('what it says after saving', () => {
  it('claims the message is up only when it is', () => {
    const up = savedMessage(make(), [make()], T);
    expect(up).toMatch(/at the top of every screen/);

    // Paired: the same message saved switched off must NOT say that. Without
    // this, a sentence that always claimed success would pass the line above.
    const down = savedMessage(make({ on: false }), [], T);
    expect(down).not.toMatch(/at the top of/);
    expect(down).toMatch(/not being shown/);
  });

  it('does not claim a scheduled message is up', () => {
    const later = make({ from: '2026-12-01' });
    const said = savedMessage(later, [later], T);
    expect(said).toMatch(/starts on 1 December/);
    expect(said).not.toMatch(/at the top of/);

    // Paired: the same message with the date reached does say it is up, so the
    // assertion above is about the date and not about the words.
    expect(savedMessage(make({ from: '2026-09-01' }), [], T)).toMatch(/at the top of/);
  });

  it('does not claim an expired message is up', () => {
    const gone = make({ until: '2026-09-10' });
    const said = savedMessage(gone, [gone], T);
    expect(said).toMatch(/archived/);
    expect(said).not.toMatch(/at the top of/);

    // Paired: the last day is inclusive. Ending today is still showing today.
    expect(savedMessage(make({ until: T }), [], T)).toMatch(/at the top of/);
  });

  it('says where in the running order it landed', () => {
    const first = make({ id: 'a', addedAt: 1 });
    const second = make({ id: 'b', addedAt: 2 });
    expect(savedMessage(second, [first, second], T)).toMatch(/2 of 2/);
    // Paired: one message on its own is not "1 of 1" — that would read as a
    // limit rather than a position.
    expect(savedMessage(first, [first], T)).not.toMatch(/of 1/);
  });

  it('does not promise anything for an empty message', () => {
    expect(savedMessage(make({ text: '   ' }), [], T)).toMatch(/no message/);
    expect(savedMessage(make({ text: '   ' }), [], T)).not.toMatch(/at the top of/);
    // Paired: text alone is what makes the difference, not the flag.
    expect(savedMessage(make(), [], T)).toMatch(/at the top/);
  });
});

describe('when a message is shown', () => {
  it('needs text, the switch, and today inside its dates', () => {
    expect(phaseOf(make(), T)).toBe('showing');
    expect(phaseOf(make({ on: false }), T)).toBe('off');
    expect(phaseOf(make({ text: '  ' }), T)).toBe('off');
    expect(phaseOf(make({ from: '2026-09-12' }), T)).toBe('scheduled');
    expect(phaseOf(make({ until: '2026-09-10' }), T)).toBe('ended');
  });

  it('lets the end date beat a switch somebody forgot', () => {
    // The date is what the admin set deliberately; the switch is what they
    // forgot. A notice whose last day has passed comes down either way.
    expect(phaseOf(make({ on: true, until: '2026-01-01' }), T)).toBe('ended');
    // Paired: the switch still matters while the dates allow it.
    expect(phaseOf(make({ on: true, until: '2026-12-01' }), T)).toBe('showing');
  });

  it('treats both dates as inclusive days', () => {
    expect(phaseOf(make({ from: T, until: T }), T)).toBe('showing');
    expect(phaseOf(make({ from: '2026-09-12', until: '2026-09-13' }), T)).toBe('scheduled');
  });

  it('reads in the order they were added', () => {
    const order = live(
      [make({ id: 'c', addedAt: 30 }), make({ id: 'a', addedAt: 10 }), make({ id: 'b', addedAt: 20 })],
      T,
    );
    expect(order.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('the limit and the archive', () => {
  const six = Array.from({ length: LIMIT }, (_, i) => make({ id: `n${i}`, addedAt: i }));

  it('counts only what is still in play', () => {
    expect(canAdd(six, T)).toBe(false);
    // Paired: ending one makes room, which is the whole reason dates exist.
    const ended = [...six.slice(1), make({ id: 'n0', addedAt: 0, until: '2026-01-01' })];
    expect(canAdd(ended, T)).toBe(true);
    expect(active(ended, T)).toHaveLength(LIMIT - 1);
    expect(archived(ended, T)).toHaveLength(1);
  });

  it('never drops something still in play, and caps what has ended', () => {
    const olds = Array.from({ length: ARCHIVE + 3 }, (_, i) =>
      make({ id: `o${i}`, addedAt: i, until: '2026-01-01' }),
    );
    const kept = trim([...six, ...olds], T);
    expect(active(kept, T)).toHaveLength(LIMIT);
    expect(archived(kept, T)).toHaveLength(ARCHIVE);
    // Paired: the ones kept are the most recent, not an arbitrary slice.
    expect(archived(kept, T)[0].id).toBe(`o${ARCHIVE + 2}`);
  });
});

describe('what cannot be saved', () => {
  it('refuses dates that run backwards and text nobody will wait for', () => {
    expect(problemWith(make({ from: '2026-09-20', until: '2026-09-10' }))).toMatch(/before/);
    expect(problemWith(make({ text: 'x'.repeat(MAX_TEXT + 1) }))).toMatch(/characters/);
    // Paired: the ordinary case has no complaint, so the check is about the
    // input and not a function that always objects.
    expect(problemWith(make({ from: '2026-09-10', until: '2026-09-20' }))).toBeNull();
    expect(problemWith(make({ text: 'x'.repeat(MAX_TEXT) }))).toBeNull();
  });
});

describe('the strip takes the colour of the worst thing in it', () => {
  it('reads the most serious tone present', () => {
    expect(mostSevere([make({ tone: 'info' }), make({ tone: 'alert' })])).toBe('alert');
    expect(mostSevere([make({ tone: 'info' }), make({ tone: 'warn' })])).toBe('warn');
    expect(mostSevere([make({ tone: 'info' })])).toBe('info');
  });
});

/**
 * The one that matters most. An internal note is where somebody writes "Legal
 * asked for this, it comes down when the Meridian deal closes" — a sentence
 * that is useful on the admin screen and damaging on every screen.
 *
 * Rendering is the only honest way to check it. A prop that is not passed today
 * is a prop somebody adds tomorrow; the markup is what people actually read.
 */
describe('the internal note never leaves the admin screen', () => {
  const secret = 'Legal asked for this until the Meridian deal closes';
  const shown = 'Trial run — do not enter confidential data.';

  it('renders the message and withholds the note', () => {
    const html = renderToStaticMarkup(
      <BroadcastStrip items={[make({ text: shown, note: secret })]} />,
    );

    expect(html).toContain(shown);
    expect(html).not.toContain(secret);

    // Paired, and this is the pairing that counts: the same renderer, handed
    // that exact sentence as the message, does put it in the markup. So its
    // absence above is the note being withheld — not this assertion being
    // blind to the string, which is how four tests here have passed while
    // catching nothing.
    const control = renderToStaticMarkup(<BroadcastStrip items={[make({ text: secret })]} />);
    expect(control).toContain(secret);
  });

  it('draws every message, not just the first', () => {
    const html = renderToStaticMarkup(
      <BroadcastStrip
        items={[
          make({ id: 'a', text: 'Change freeze from Friday', addedAt: 1 }),
          make({ id: 'b', text: 'Payroll is read-only today', tone: 'warn', addedAt: 2 }),
          make({ id: 'c', text: 'Storage incident ongoing', tone: 'alert', addedAt: 3 }),
        ]}
      />,
    );
    expect(html).toContain('Change freeze from Friday');
    expect(html).toContain('Payroll is read-only today');
    expect(html).toContain('Storage incident ongoing');
    // The strip wears the worst tone in it.
    expect(html).toContain('bg-red-50');
  });

  it('says each message once, however many copies the loop needs', () => {
    // The strip repeats the run as many times as it takes to fill the screen.
    // Exactly one copy may be announced: a screen reader reading the same six
    // notices four times over is worse than no marquee at all.
    const html = renderToStaticMarkup(
      <BroadcastStrip items={[make({ id: 'a', text: 'Change freeze from Friday' })]} />,
    );
    // Matched on the <ul> specifically: the tone icons carry aria-hidden too,
    // and a looser pattern counts those instead — which is a test that passes
    // while measuring the wrong thing.
    const runs = html.match(/<ul class="vm-run[^"]*"/g) ?? [];
    const hidden = html.match(/<ul class="vm-run[^"]*" aria-hidden="true"/g) ?? [];

    expect(runs.length).toBeGreaterThan(1);
    expect(hidden).toHaveLength(runs.length - 1);

    // Paired: exactly one run is left for a screen reader to read, so the line
    // above is about which copies are hidden and not about all of them being.
    expect(runs.length - hidden.length).toBe(1);
  });

  it('is nothing at all when there is nothing to say', () => {
    expect(renderToStaticMarkup(<BroadcastStrip items={[]} />)).toBe('');
  });
});

describe('a device that still holds the single banner', () => {
  it('reads it as a message rather than losing it', () => {
    const folded = broadcastsOf({
      banner: { on: true, text: 'Trial run', tone: 'warn' },
      updatedAt: 5,
    });
    expect(folded).toHaveLength(1);
    expect(folded[0].text).toBe('Trial run');
    expect(live(folded, T)).toHaveLength(1);

    // Paired: once the new list exists it is the one that counts, so the old
    // record cannot resurrect a notice somebody took down.
    const both = broadcastsOf({
      banner: { on: true, text: 'Trial run', tone: 'warn' },
      broadcasts: [],
    });
    expect(both).toHaveLength(0);
  });

  it('does not invent a message out of an empty banner', () => {
    expect(broadcastsOf({ banner: { on: true, text: '  ', tone: 'info' } })).toHaveLength(0);
    expect(broadcastsOf(undefined)).toHaveLength(0);
  });
});

describe('today', () => {
  it('is the local day, not the UTC one', () => {
    // A notice ending "today" must end at the end of the admin's day. Read from
    // the local calendar fields for that reason.
    expect(today(new Date(2026, 8, 11, 23, 30))).toBe('2026-09-11');
    expect(today(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});
