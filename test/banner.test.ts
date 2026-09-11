import { describe, expect, it } from 'vitest';
import { EMPTY, isShowing, savedMessage } from '@/lib/admin/banner';

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
 * These guard the sentence. A confirmation that can describe a state the thing
 * is not in will eventually be believed.
 */
describe('what it says after saving', () => {
  it('claims the banner is up only when it is', () => {
    const up = savedMessage({ on: true, text: 'Trial run', tone: 'info' });
    expect(up).toMatch(/at the top of every screen/);

    // Paired: the same message saved switched off must NOT say that. Without
    // this, a sentence that always claimed success would pass the line above.
    const down = savedMessage({ on: false, text: 'Trial run', tone: 'info' });
    expect(down).not.toMatch(/at the top of/);
    expect(down).toMatch(/not being shown/);
  });

  it('does not promise anything for an empty message', () => {
    const blank = savedMessage({ on: true, text: '   ', tone: 'info' });
    expect(blank).toMatch(/no message/);
    expect(blank).not.toMatch(/at the top of/);
    // Paired: text alone is what makes the difference, not the flag.
    expect(savedMessage({ on: true, text: 'Something', tone: 'info' })).toMatch(/at the top/);
  });
});

describe('whether the strip appears at all', () => {
  it('needs both a message and the switch', () => {
    expect(isShowing({ on: true, text: 'Trial run', tone: 'info' })).toBe(true);
    expect(isShowing({ on: false, text: 'Trial run', tone: 'info' })).toBe(false);
    expect(isShowing({ on: true, text: '  ', tone: 'info' })).toBe(false);
    expect(isShowing(undefined)).toBe(false);
    expect(isShowing(EMPTY)).toBe(false);
  });
});
