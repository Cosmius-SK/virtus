import type { Entry } from './types';

/**
 * Names the note used that Virtus does not know yet.
 *
 * biblio's mistake, stated plainly in §3: its cast was built as a settings page
 * first, and a settings page is a page nobody visits. It only worked once the
 * offer was made at the moment it explained itself — right after a result, when
 * the person had just seen why it mattered.
 *
 * So this never becomes a wizard. It is a quiet line under a finished document
 * saying "you mentioned these and I do not know them", which is the one moment
 * where teaching the tool is obviously worth ten seconds.
 */

/** Words that are capitalised for reasons other than being names. */
const NOT_NAMES = new Set([
  'the', 'this', 'that', 'these', 'those', 'and', 'but', 'for', 'with', 'from', 'into',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'wave', 'sprint', 'phase', 'sev', 'status', 'note', 'notes', 'summary',
  'given', 'when', 'then', 'risk', 'issue', 'action', 'owner', 'impact',
]);

export interface Notice {
  name: string;
  /** How many times the note used it. Frequency is the evidence it matters. */
  times: number;
}

export function unknownNames(note: string, known: Entry[]): Notice[] {
  const seen = new Set(known.map((e) => e.name.toLowerCase()));
  const counts = new Map<string, number>();

  // A capitalised word not at the start of a sentence, or an all-caps token
  // that is not an ordinary shout — PRE-2, CAB, ITSM.
  const words = note.match(/\b[A-Z][A-Za-z][A-Za-z'-]{1,}\b|\b[A-Z]{2,}(?:-\d+)?\b/g) ?? [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (NOT_NAMES.has(key) || seen.has(key)) continue;
    // A word that also appears lowercase in the same note is a sentence start,
    // not a name.
    if (new RegExp(`\\b${escape(word.toLowerCase())}\\b`).test(note.replace(/[A-Z]/g, (c) => c))) {
      const lowerUses = note.split(new RegExp(`\\b${escape(word.toLowerCase())}\\b`)).length - 1;
      const upperUses = note.split(new RegExp(`\\b${escape(word)}\\b`)).length - 1;
      if (lowerUses > upperUses) continue;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, times]) => ({ name, times }))
    .sort((a, b) => b.times - a.times || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
