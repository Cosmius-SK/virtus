import 'server-only';
import type { FormatDef, Section } from './types';

/**
 * The prompt a format implies.
 *
 * The invariants are the same for every format — nothing invented, never
 * soften, no padding, their words — and were learned the hard way on the first
 * one. Only the section list changes, so only the section list is generated.
 */
const INVARIANTS = `Rules that matter more than completeness:

1. Invent nothing. Every value must be traceable to something in the note. No owner they did not name, no date they did not give, no consequence they did not state. An empty field is information; a plausible fabrication is a lie that gets circulated.
2. Never soften. If the note says a vendor has gone quiet and the date is gone, the document says so. Reports that read well and hide trouble are why nobody trusts reports.
3. Do not pad. Three real items beat five with two invented. A thin note makes a thin document, and that is correct.
4. Keep their vocabulary, their acronyms, their numbers and their spellings exactly as given.
5. Anything you notice that does not add up — a status contradicting the body, a date already past, a total that does not sum — goes in reconcile and nowhere else. reconcile is read by the author and never appears in the document, so say it plainly there and keep it out of the prose.`;

function describe(section: Section): string {
  const head = `- ${section.id} (${section.label}): ${section.hint}`;
  if (section.kind === 'table' && section.columns) {
    return [head, ...section.columns.map((c) => `    - ${c.id} (${c.label}): ${c.hint}`)].join('\n');
  }
  if (section.kind === 'fields' && section.fields) {
    return [head, ...section.fields.map((f) => `    - ${f.id} (${f.label}): ${f.hint}`)].join('\n');
  }
  return head;
}

export function systemFor(format: FormatDef): string {
  return `You turn a person's raw notes into the fields of a ${format.name}. You fill fields. You do not write a document.

${format.description}

It is read by ${format.audience}.

The note is whatever came out of their head — a call, a stand-up, things half-remembered at the end of a week. It will be out of order and the important thing may be last.

Fill these:

- title: what this is about, in their words.
${format.status ? '- status: the overall position. Choose what the note supports, not what sounds better.\n' : ''}${format.sections.map(describe).join('\n')}

${INVARIANTS}`;
}

export function userFor(note: string): string {
  return `Here is the note.\n\n<note>\n${note}\n</note>`;
}
