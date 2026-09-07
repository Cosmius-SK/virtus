/**
 * What a document costs to make.
 *
 * Someone will ask what this costs per person per month, and the answer being
 * "less than the coffee" is worth far less than the answer being a number
 * (§10). So the number is measured from real token counts rather than
 * estimated, and shown in the currency people think in — pence.
 *
 * Prices are per million tokens, from Anthropic's published rates. They are
 * here rather than in an env var because a wrong price shown confidently is
 * worse than no price at all, and a table in code gets reviewed.
 */
export interface Price {
  input: number;
  output: number;
}

export const PRICES: Record<string, Price> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

/** Dollars. Unknown model returns null rather than a guess. */
export function costOf(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICES[model];
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/**
 * Money at this scale is fractions of a penny, and "$0.0043" reads as noise.
 * Below a penny, say so in tenths; above it, be exact.
 */
export function money(dollars: number | null): string {
  if (dollars === null) return 'unpriced';
  const pence = dollars * 100;
  if (pence < 0.1) return 'under 0.1p';
  if (pence < 10) return `${pence.toFixed(1)}p`;
  return `${pence.toFixed(0)}p`;
}
