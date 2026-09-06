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

/**
 * A weekly status one-pager: one slide, dense, the thing that actually gets
 * circulated. Modelled on the template the firm already uses.
 *
 * This is a FORMAT, not a shape. Shapes are the vocabulary a deck is written
 * in and stay at seven; formats are the sentences, and there should be many.
 * A format needs no new shapes.
 */
export const WsrRiskSchema = z.object({
  risk: z.string().describe('The risk or challenge, in their words.'),
  impact: z.string().describe('What it does to the project if it lands.'),
  raised: z.string().describe('When it was raised, or an empty string.'),
  owner: z.string().describe('Who owns it, or an empty string.'),
  mitigation: z.string().describe('The plan, or an empty string.'),
  closure: z.string().describe('Expected closure, or an empty string.'),
});

export const WsrSchema = z.object({
  title: z.string().describe('The programme or workstream this reports on.'),
  projectId: z.string().describe('Project id if the note gives one, else "NA".'),
  projectName: z.string().describe('Project name if given, else an empty string.'),
  startDate: z.string().describe('Start date as written, or an empty string.'),
  endDate: z.string().describe('End date as written, or an empty string.'),
  status: z
    .enum(['On Track', 'In Progress', 'Completed', 'At Risk', 'Delayed'])
    .describe('Overall status. Only what the note supports.'),
  executiveSummary: z.string().describe('Two or three sentences. What a reader must know.'),
  keyDecisions: z.array(z.string()).describe('Decisions taken or needed.'),
  accomplishments: z.array(z.string()).describe('What actually moved this period.'),
  upcoming: z.array(z.string()).describe('What is committed next.'),
  risks: z.array(WsrRiskSchema).describe('Risks and challenges.'),
});

export type WsrRisk = z.infer<typeof WsrRiskSchema>;
export type Wsr = z.infer<typeof WsrSchema>;
