import 'server-only';
import { orgPrompt, type OrgContext } from '@/lib/org/types';
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
4. Their words means their vocabulary, their acronyms, their names, their numbers and their spellings — exactly as given, never swapped for a smarter one. It does not mean their sentences. Write each entry the way the document needs it: a table cell is a heading somebody scans in a meeting, not the line from the note with its "we asked" and "they say" still attached. The story of how something came up is not the thing itself.
5. Each thing the note says goes in ONE section. Where it could sit in two, put it where a reader would look for it first and leave it out of the other. The same fact in two places makes a thin document look padded and a full one look careless.
6. Anything you notice that does not add up — a status contradicting the body, a date already past, a total that does not sum — goes in reconcile and nowhere else. reconcile is read by the author and never appears in the document, so say it plainly there and keep it out of the prose.`;

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

export function systemFor(format: FormatDef, org?: OrgContext): string {
  return `You turn a person's raw notes into the fields of a ${format.name}. You fill fields. You do not write a document.

${format.description}

It is read by ${format.audience}.

The note is whatever came out of their head — a call, a stand-up, things half-remembered at the end of a week. It will be out of order and the important thing may be last.

Fill these:

- title: what this is about, in their words.
${format.status ? '- status: the overall position. Choose what the note supports, not what sounds better.\n' : ''}${format.sections.map(describe).join('\n')}

${INVARIANTS}${org ? orgPrompt(org) : ''}`;
}

export function userFor(note: string, opts?: { guided?: boolean; instruction?: string }): string {
  const parts = [`Here is the note.\n\n<note>\n${note}\n</note>`];
  // Where the person typed into the template's own boxes, they have already
  // said which section each thing belongs to. Moving it would be overruling a
  // decision they made deliberately, which is the opposite of what they asked
  // the tool for.
  if (opts?.guided) {
    parts.push(
      'The note is grouped under headings that match the sections above, because the person typed it that way. Keep each thing in the section they put it in. Move something only if it is plainly about a different section, and never to fill a section they left empty.',
    );
  }
  if (opts?.instruction?.trim()) {
    parts.push(
      `They have read a first version and asked for this:\n\n<asked>\n${opts.instruction.trim()}\n</asked>\n\nDo what they asked. It does not license inventing anything the note does not support: if they ask for something the note cannot supply, leave it out rather than supply it.`,
    );
  }
  return parts.join('\n\n');
}

/**
 * The prompt for rewriting one section.
 *
 * Deliberately narrow. It sees the note, the section it is rewriting, and what
 * was asked — not the rest of the document, because a section that reads
 * differently depending on what sits above it is a section that will change
 * every time something else does.
 */
export function rewriteSystem(format: FormatDef, section: Section, org?: OrgContext): string {
  return `You are rewriting one section of a ${format.name}, read by ${format.audience}.

The section is:

${describe(section)}

Return only that section's value, in the same shape it is already in.

${INVARIANTS}${org ? orgPrompt(org) : ''}`;
}

export function rewriteUser(note: string, current: string, instruction: string): string {
  return `Here is the note the document was made from.

<note>
${note}
</note>

Here is the section as it stands.

<current>
${current}
</current>

${
  instruction.trim()
    ? `They asked for this:\n\n<asked>\n${instruction.trim()}\n</asked>`
    : 'They asked for another attempt without saying what was wrong. Say the same facts differently — sharper, or ordered better. Do not add facts to make it look like more has changed.'
}`;
}
