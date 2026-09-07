import { z } from 'zod';

/**
 * The seven shapes, and no more on day one (§6). An eighth is always tempting
 * and is never the reason someone does or doesn't adopt this.
 */
export const SHAPES = [
  'title',
  'contents',
  'statement',
  'bullets',
  'two-column',
  'chart',
  'next-steps',
] as const;

export type Shape = (typeof SHAPES)[number];

/**
 * One model pass over the mess, returning fixed fields rather than prose (§13.2).
 * Fields, because everything downstream is built from them — you cannot lay out
 * a paragraph.
 */
export const StructureSchema = z.object({
  title: z.string().describe("Short, from their own words. Never invented."),
  points: z
    .array(z.string())
    .describe('What they actually said, tidied, as separate points.'),
  questions: z.array(z.string()).describe('What the note leaves open.'),
  next: z
    .string()
    .describe('The single next step in their own words, or an empty string.'),
  mentions: z
    .array(z.string())
    .describe('People, clients, projects and systems named in the note.'),
});

export type Structure = z.infer<typeof StructureSchema>;

/**
 * The argument, before any slide exists. This is the step people judge the
 * product by, and it is cheap — it is text.
 *
 * `support` is uniform across shapes so one edited list stays one edited list.
 * Shapes read it by convention, and every convention degrades to bullets:
 *   two-column  each item is "left || right"
 *   chart       each item is "Label: 42"
 *   next-steps  each item is an action, optionally "Owner — action — when"
 */
export const OutlineSlideSchema = z.object({
  shape: z.enum(SHAPES),
  claim: z.string().describe('The one sentence this slide is making.'),
  support: z
    .array(z.string())
    .describe('Two to four points underneath the claim.'),
});

export const OutlineSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  slides: z.array(OutlineSlideSchema),
});

export type OutlineSlide = z.infer<typeof OutlineSlideSchema>;
export type Outline = z.infer<typeof OutlineSchema>;
