/**
 * What the organisation knows about itself.
 *
 * biblio's most important feature was never its illustrations — it was a small
 * store of the people, places and things a person keeps writing about, so the
 * same family looked like the same family in every picture. The principle
 * carries over intact (§3):
 *
 *   The world model is the feature. Generation is one consumer of it.
 *
 * This is also the answer to "what if the model does this natively", which for
 * an internal tool is a windfall rather than a threat: generation getting better
 * for free is good news, and the part that is ours — what the organisation knows
 * about itself — keeps its value whoever does the writing.
 */
export type EntryKind = 'person' | 'client' | 'system' | 'product' | 'term';

export const KINDS: { id: EntryKind; label: string; hint: string }[] = [
  { id: 'person', label: 'People', hint: 'Colleagues and stakeholders. Role, and what they care about.' },
  { id: 'client', label: 'Clients', hint: 'Accounts and customers, spelled the way they spell themselves.' },
  { id: 'system', label: 'Systems', hint: 'Platforms, services and environments by their real names.' },
  { id: 'product', label: 'Products', hint: 'What this firm sells or runs.' },
  { id: 'term', label: 'Terminology', hint: 'Acronyms and house words — and the ones to avoid.' },
];

export interface Entry {
  id: string;
  ownerId: string;
  kind: EntryKind;
  /** Exactly as it should be written. This is the spelling that wins. */
  name: string;
  /**
   * A line or two. For a person: role and how they like to be written to. For a
   * term: what it means here. Never a biography — the useful part is short.
   */
  about: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** What travels to the model with a note. */
export interface OrgContext {
  entries: { kind: EntryKind; name: string; about: string }[];
}

/**
 * The organisation model as a paragraph the model can use.
 *
 * Deliberately not "here is a database". It reads as what a colleague would
 * tell you before you wrote something for this firm, which is the register the
 * output should come back in.
 */
export function orgPrompt(ctx: OrgContext): string {
  if (!ctx.entries.length) return '';
  const byKind = new Map<EntryKind, typeof ctx.entries>();
  for (const e of ctx.entries) byKind.set(e.kind, [...(byKind.get(e.kind) ?? []), e]);

  const blocks: string[] = [];
  for (const { id, label } of KINDS) {
    const list = byKind.get(id);
    if (!list?.length) continue;
    blocks.push(
      `${label}:\n${list.map((e) => `- ${e.name}${e.about ? ` — ${e.about}` : ''}`).join('\n')}`,
    );
  }

  return `\n\nThings this organisation already knows about itself. Use these spellings exactly, and use these words rather than your own for the same ideas. Do not mention this list, do not add anyone to it, and do not assume anything not written here.\n\n${blocks.join('\n\n')}`;
}
