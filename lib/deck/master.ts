/**
 * One master, defined in code (§6).
 *
 * Deliberately NOT read from the company's existing .potx. That is a project of
 * its own and it is not what makes the demo land.
 *
 * The palette and typeface below are the firm's own, taken from the 2Q26
 * earnings presentation — see docs/brand.md for how they were derived and what
 * each one is for. This file is the only place they live: change a colour here
 * and every slide, in every shape, follows.
 */
export const MASTER = 'VIRTUS';

export const BRAND = {
  /** The house green. The dominant colour of the firm's own decks. */
  accent: '0F7F40',
  /** The second green, used on the firm's rules and outlines. */
  accentLine: '008555',
  /** Pale tints, for a panel that must sit behind text and stay readable. */
  accentSoft: 'CCE6DD',
  accentSofter: 'EAF5F0',

  ink: '1A1A1A',
  muted: '6D6D6D',
  rule: 'DBDBDB',
  ruleSoft: 'EAEAEA',
  paper: 'FFFFFF',

  /**
   * Trebuchet MS, embedded in the firm's own deck in all four cuts. There is no
   * light cut, so headings are separated from body by size and colour rather
   * than weight.
   */
  face: 'Trebuchet MS',
  faceHeading: 'Trebuchet MS',
} as const;

/**
 * Chart series, in order, from the firm's own charts: house green first, then
 * the deep blue it pairs with, then amber, then red for a negative. Only the
 * first is used today — the renderer draws one series — but the order is the
 * firm's and should be kept when more arrive.
 */
export const CHART_SERIES = ['0F7F40', '00497F', 'FBC150', 'EE2724', '008555'] as const;

/** 16:9 is 10in x 5.625in. Every position below is in inches. */
export const GRID = {
  w: 10,
  h: 5.625,
  marginX: 0.62,
  titleY: 0.52,
  bodyY: 1.55,
  get bodyW() {
    return this.w - this.marginX * 2;
  },
  get bodyH() {
    return this.h - this.bodyY - 0.75;
  },
} as const;

export const FOOTER = process.env.VIRTUS_DECK_FOOTER ?? 'Internal';
