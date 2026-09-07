import { z } from 'zod';
import { STATUS_NAMES } from '@/lib/deck/status';
import type { FormatDef, Section } from './types';

/**
 * The Zod schema a format's sections imply.
 *
 * Built at request time rather than written by hand, so a format added to the
 * registry is immediately something the model can fill and the app can
 * validate. Every field is required — structured outputs want it, and an
 * optional field is one the model quietly skips.
 */
function sectionSchema(section: Section): z.ZodTypeAny {
  switch (section.kind) {
    case 'paragraph':
      return z.string().describe(section.hint);
    case 'list':
      return z.array(z.string()).describe(section.hint);
    case 'table': {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const col of section.columns ?? []) {
        shape[col.id] = z.string().describe(col.hint);
      }
      return z.array(z.object(shape)).describe(section.hint);
    }
    case 'fields': {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const field of section.fields ?? []) {
        shape[field.id] = z.string().describe(field.hint);
      }
      return z.object(shape).describe(section.hint);
    }
  }
}

/**
 * The schema for one section on its own.
 *
 * A rewrite of a single section must not be able to touch the others. Asking
 * for the whole document and keeping one field would still pay for the whole
 * document, and would still let a good paragraph move underneath somebody who
 * only asked about the one below it.
 */
export function schemaForSection(section: Section) {
  return z.object({ value: sectionSchema(section) });
}

export function schemaFor(format: FormatDef) {
  const sections: Record<string, z.ZodTypeAny> = {};
  for (const section of format.sections) sections[section.id] = sectionSchema(section);

  return z.object({
    title: z.string().describe('What this document is about, in their own words.'),
    status: z
      .enum(STATUS_NAMES as [string, ...string[]])
      .describe(
        format.status
          ? 'Overall status. Only what the note supports; if it does not say, In Progress.'
          : 'Not shown on this format. Use In Progress.',
      ),
    reconcile: z
      .array(z.string())
      .describe(
        'Things in the note that do not add up, written to its author. Never rendered, so say it plainly. Empty when the note is consistent.',
      ),
    sections: z.object(sections),
  });
}
