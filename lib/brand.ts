/**
 * Virtus's own identity — deliberately not the same thing as the house style
 * the documents wear.
 *
 * `lib/deck/master.ts` holds the palette and typeface of whoever owns the
 * output; a status report leaving this building should look like the firm's,
 * not like a tool's. This file is the product itself: the app, the marks, the
 * chrome. Keeping them apart is the point — the tool adapts to whoever it is
 * working for, and says so by not stamping itself on the work.
 */
export const VIRTUS = {
  /** The mark's orange. One value; everything else is derived from it. */
  accent: '#F4531C',
  accentDark: '#D8410E',
  accentTint: '#FFF1EA',

  /** Slate, not black. Enterprise software is read for hours. */
  ink: '#131A24',
  ink80: '#2B3644',
  ink60: '#586576',
  ink40: '#8A94A2',
  line: '#E3E7EC',
  lineSoft: '#EFF2F5',
  paper: '#FFFFFF',
  canvas: '#F5F7F9',

  /** The dark surface from the banner, for headers and inverted panels. */
  night: '#1B2430',
  nightSoft: '#232E3C',
} as const;
