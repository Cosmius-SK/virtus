import { z } from 'zod';

/**
 * A house style, read out of a deck or document somebody already uses.
 *
 * The alternative was a colour picker, and a colour picker asks the wrong
 * person the wrong question: nobody knows their firm's accent colour as a hex
 * value, and the person who does is not the one making a status report. Every
 * firm does have a template file, though, and it carries the answer in a form
 * that cannot be misremembered.
 *
 * What this reads is the Office theme — six accent colours and two typefaces —
 * and nothing else. It does not read layouts, masters or logos. That is
 * deliberate: a theme is a small, stable, well-specified part of the file, and
 * a layout is not. Claiming to import somebody's template and producing a near
 * miss would be worse than not offering it.
 *
 * Status colours are excluded on purpose (see lib/deck/status.ts). A firm whose
 * brand colour is red does not get to make "Delayed" look calm.
 */
export interface House {
  /** What it was read from, so somebody can tell which file this came from. */
  from: string;
  accent: string;
  accentLine: string;
  accentSoft: string;
  accentSofter: string;
  ink: string;
  face: string;
  faceHeading: string;
  series: string[];
}

/** Office writes colours as six hex digits, sometimes with a leading hash. */
export function hex(value: string | undefined, fallback: string): string {
  const clean = (value ?? '').replace(/^#/, '').trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(clean) ? clean : fallback;
}

/**
 * Toward white by `amount`.
 *
 * The theme gives one accent; a panel behind text needs a pale version of it
 * that is still recognisably the same colour. Asking somebody to supply three
 * tints of their own brand colour is asking them to do design work to use a
 * status report.
 */
export function tint(colour: string, amount: number): string {
  const n = parseInt(hex(colour, '000000'), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Relative luminance, to keep a theme's "dark" colour from being a pale one. */
function light(colour: string): boolean {
  const n = parseInt(hex(colour, '000000'), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

/**
 * The theme XML → a house style.
 *
 * Parsed with expressions rather than an XML library because the shape being
 * read is four attributes deep in a schema that has not changed since 2007, and
 * a parser would be a dependency carried for that.
 */
export function houseFromTheme(xml: string, from: string): House {
  const scheme = xml.match(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/)?.[0] ?? '';

  function colour(name: string, fallback: string): string {
    const block = scheme.match(new RegExp(`<a:${name}>([\\s\\S]*?)</a:${name}>`))?.[1] ?? '';
    const srgb = block.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/)?.[1];
    // A system colour carries its resolved value in lastClr; without that there
    // is nothing usable, and guessing is how a document comes out grey.
    const sys = block.match(/<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/)?.[1];
    return hex(srgb ?? sys, fallback);
  }

  const accent = colour('accent1', '0F7F40');
  const dk1 = colour('dk1', '1A1A1A');
  const dk2 = colour('dk2', '1A1A1A');

  const fonts = xml.match(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/)?.[0] ?? '';
  const major = fonts.match(/<a:majorFont>\s*<a:latin typeface="([^"]*)"/)?.[1];
  const minor = fonts.match(/<a:minorFont>\s*<a:latin typeface="([^"]*)"/)?.[1];

  return {
    from,
    accent,
    accentLine: colour('accent2', accent),
    accentSoft: tint(accent, 0.72),
    accentSofter: tint(accent, 0.9),
    // Themes sometimes name a pale colour as dk1. Body text in it is unreadable
    // and the file still opens, so the fallback is checked rather than trusted.
    ink: light(dk1) ? (light(dk2) ? '1A1A1A' : dk2) : dk1,
    face: minor?.trim() || 'Calibri',
    faceHeading: major?.trim() || minor?.trim() || 'Calibri',
    series: [
      accent,
      colour('accent2', '00497F'),
      colour('accent3', 'FBC150'),
      colour('accent4', 'EE2724'),
      colour('accent5', '008555'),
      colour('accent6', '6D6D6D'),
    ],
  };
}

/**
 * A house style arriving with a request. Validated because it comes off the
 * device: a malformed colour reaches pptxgenjs as a colour and comes out of the
 * other side as a document that is subtly wrong rather than an error.
 */
const HEX = z.string().regex(/^[0-9A-Fa-f]{6}$/);

export const HouseSchema = z.object({
  from: z.string().max(300),
  accent: HEX,
  accentLine: HEX,
  accentSoft: HEX,
  accentSofter: HEX,
  ink: HEX,
  face: z.string().min(1).max(80),
  faceHeading: z.string().min(1).max(80),
  series: z.array(HEX).min(1).max(12),
});

/** The parts a renderer overrides. `from` is provenance and not a colour. */
export function paletteFrom(house: House) {
  return {
    accent: house.accent,
    accentLine: house.accentLine,
    accentSoft: house.accentSoft,
    accentSofter: house.accentSofter,
    ink: house.ink,
    face: house.face,
    faceHeading: house.faceHeading,
    series: house.series,
  };
}

/** What travelled with a request, or nothing. Never a reason to refuse a render. */
export function houseFrom(carried: unknown) {
  const parsed = HouseSchema.safeParse(carried);
  return parsed.success ? paletteFrom(parsed.data as House) : undefined;
}
