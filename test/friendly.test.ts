import { describe, expect, it } from 'vitest';
import { friendly } from '@/lib/friendly';

/**
 * This layer exists for one moment: a failure in front of a leader, on a
 * conference-room network, with everyone watching. So the test is not "does it
 * return a string" — it is "would this sentence be survivable on a screen".
 */
describe('a failure, said out loud', () => {
  it('never says error, and never shows a status code', () => {
    const cases: [unknown, number | undefined][] = [
      [new Error('fetch failed'), undefined],
      [new Error('AbortError: signal timed out'), undefined],
      [new Error('rate limit exceeded'), 429],
      [new Error('Internal Server Error'), 500],
      [new Error('ANTHROPIC_API_KEY is not set'), 500],
      ['', 500],
      [null, undefined],
    ];
    for (const [raw, status] of cases) {
      const { message } = friendly(raw, status);
      expect(message.toLowerCase(), String(raw)).not.toContain('error');
      expect(message, String(raw)).not.toMatch(/\b[45]\d\d\b/);
      expect(message.length, String(raw)).toBeGreaterThan(20);
    }
  });

  it('tells someone to try again only when trying again could work', () => {
    expect(friendly(new Error('signal timed out')).retry).toBe(true);
    expect(friendly(new Error('rate limit'), 429).retry).toBe(true);
    expect(friendly(new Error('boom'), 503).retry).toBe(true);

    // These do not get better by pressing the button again.
    expect(friendly(new Error('ANTHROPIC_API_KEY is not set')).retry).toBe(false);
    expect(friendly(new Error('Your network blocked this request')).retry).toBe(false);
    expect(friendly(new Error('The model declined this note.')).retry).toBe(false);
    expect(friendly(new Error('longer than one pass'), 413).retry).toBe(false);
  });

  it('names the proxy case specifically, because it looks like a refusal and is not', () => {
    const { message } = friendly(
      new Error('Your network blocked this request — it returned a web page rather than an answer.'),
    );
    expect(message).toContain('network blocked');
    expect(message).toContain('proxies');
  });

  it('says what to do about a missing key rather than what went wrong', () => {
    expect(friendly(new Error('No Anthropic credentials — set ANTHROPIC_API_KEY')).message).toContain(
      'ANTHROPIC_API_KEY',
    );
  });
});
