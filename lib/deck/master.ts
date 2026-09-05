/**
 * One master, defined in code (§6).
 *
 * Deliberately NOT read from the company's existing .potx. That is a project of
 * its own and it is not what makes the demo land. When the organisation model
 * arrives this is the file it feeds — brand colours, a typeface, logo position,
 * a footer — and nothing else in the renderer needs to know.
 */
export const MASTER = 'VIRTUS';

export const BRAND = {
  ink: '12161C',
  muted: '5B6470',
  rule: 'D8D4CA',
  paper: 'FFFFFF',
  accent: '1F4F8B',
  accentSoft: 'E7EEF7',
  face: 'Calibri',
  faceHeading: 'Calibri Light',
} as const;

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
