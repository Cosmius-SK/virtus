import type { StatusName } from '@/lib/deck/status';

/**
 * A format described as data rather than code.
 *
 * Yesterday's lesson: shapes are the vocabulary and stay at seven; formats are
 * the sentences and there should be many. Hand-writing a renderer per format
 * makes the twentieth one as expensive as the first, which is how a tool ends
 * up with three formats and a backlog.
 *
 * So a format is a list of named sections. One engine builds the schema the
 * model fills, the prompt that tells it how, the screen that edits the result,
 * and the slide. Adding a format is adding an entry to the registry — which is
 * also what makes an admin screen a small job later rather than a rewrite.
 */

/** How a section holds its content, and therefore how it is drawn and edited. */
export type SectionKind =
  /** One block of prose. An executive summary, a decision, a conclusion. */
  | 'paragraph'
  /** Bullets. The workhorse. */
  | 'list'
  /** Rows and columns. Risks with owners, actions with dates. */
  | 'table'
  /** A single row of labelled values across the top. Dates, ids, a status. */
  | 'fields';

export interface Column {
  id: string;
  label: string;
  /** Told to the model. Say what belongs here and what does not. */
  hint: string;
  /** Relative width. Shares of the row. */
  width: number;
}

export interface Field {
  id: string;
  label: string;
  hint: string;
  width: number;
}

export interface Section {
  id: string;
  label: string;
  kind: SectionKind;
  hint: string;
  /** Inches of slide height. Normalised if the sections together overflow. */
  height: number;
  /** Sit beside the next section rather than below it. */
  beside?: boolean;
  /** How many rows or bullets fit before the rest are left off the slide. */
  max?: number;
  columns?: Column[];
  fields?: Field[];
}

/**
 * What a format can be turned into.
 *
 * The same section list describes both: a slide is the dense view and a Word
 * document is the long one. A status report wants to be a slide; a test plan
 * wants to be a document; several are genuinely useful as either, and it costs
 * nothing to offer both once the sections are data.
 */
export type Output = 'pptx' | 'docx' | 'pdf';

/**
 * How much room a format gets.
 *
 * A one-pager puts everything on one slide, which is what gets circulated. A
 * pack gives each section its own slide, which is what gets presented — a
 * steering committee is walked through an argument, not handed a dense page and
 * left to read it while someone talks over them.
 *
 * The section list is identical either way. Only the room changes.
 */
export type Layout = 'one-pager' | 'pack';

/**
 * Where a template sits in the store, in the order the shelves are shown.
 *
 * A list rather than a bare union, because the store, the admin screen and the
 * validator all need to enumerate them and three copies of five strings is
 * three chances to disagree.
 */
export const CATEGORIES = [
  'Project & delivery',
  'Operations',
  'Engineering',
  'Requirements & testing',
  'Governance packs',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface FormatDef {
  id: string;
  name: string;
  /** Shown on the picker. What this is for, in the words someone would search. */
  description: string;
  /** Who reads it. Steers how blunt the writing should be. */
  audience: string;
  /** Which shelf of the template store this sits on. */
  category: Category;
  /** Whether the banner row carries a status chip. */
  status: boolean;
  /** Slide, Word document, or both. First is the default offered. */
  outputs: Output[];
  /** One dense slide, or one slide per section. Defaults to a one-pager. */
  layout?: Layout;
  sections: Section[];
}

/** What the model returns and the screen edits. */
export type SectionValue = string | string[] | Record<string, string>[] | Record<string, string>;

export interface FormatDoc {
  title: string;
  status: StatusName;
  /** Contradictions, for the author. Never rendered (§11). */
  reconcile: string[];
  sections: Record<string, SectionValue>;
}
