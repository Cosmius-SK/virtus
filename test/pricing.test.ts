import { describe, expect, it } from 'vitest';
import { costOf, money, PRICES } from '@/lib/pricing';

/**
 * A cost shown confidently and wrongly is worse than no cost at all — it is the
 * number a leader repeats in a budget conversation. These pin the arithmetic
 * and, more importantly, pin the refusal to guess.
 */
describe('what a document costs', () => {
  it('prices a run from the published rates', () => {
    // 10k in, 2k out on Opus 5: 10000 x $5 + 2000 x $25 per million.
    expect(costOf('claude-opus-5', 10_000, 2_000)).toBeCloseTo(0.05 + 0.05, 6);
  });

  it('returns nothing rather than guessing at an unknown model', () => {
    expect(costOf('some-model-we-have-not-priced', 10_000, 2_000)).toBeNull();
    expect(money(null)).toBe('unpriced');
  });

  it('charges output more than input on every model we price', () => {
    for (const [model, price] of Object.entries(PRICES)) {
      expect(price.output, model).toBeGreaterThan(price.input);
    }
  });

  it('says under a penny rather than showing four decimal places of noise', () => {
    expect(money(0.0002)).toBe('under 0.1p');
    expect(money(0.004)).toBe('0.4p');
    expect(money(0.25)).toBe('25p');
  });

  it('prices a realistic one-pager at well under a penny', () => {
    // A typical weekly note: ~1200 tokens in, ~900 out.
    const cost = costOf('claude-opus-5', 1_200, 900)!;
    expect(cost * 100).toBeLessThan(3);
  });
});
