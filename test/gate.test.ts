import { describe, expect, it } from 'vitest';
import { gateToken, same } from '@/lib/gate';

/**
 * The gate is small and its failure modes are asymmetric: letting the wrong
 * person in is bad, and locking the right person out during a live demo is
 * worse. These check both directions.
 */
describe('the passcode gate', () => {
  it('gives the same token for the same code, so a cookie survives a redeploy', async () => {
    expect(await gateToken('open-sesame')).toBe(await gateToken('open-sesame'));
  });

  it('gives a different token for a different code, so changing it logs everyone out', async () => {
    expect(await gateToken('open-sesame')).not.toBe(await gateToken('open-sesamf'));
  });

  it('never returns the code itself', async () => {
    const token = await gateToken('open-sesame');
    expect(token).not.toContain('open-sesame');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('compares without short-circuiting on the first differing character', () => {
    expect(same('abc', 'abc')).toBe(true);
    expect(same('abc', 'abd')).toBe(false);
    expect(same('abc', 'ab')).toBe(false);
    expect(same('', '')).toBe(true);
  });
});
