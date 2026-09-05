import 'server-only';
import type { Structure } from '@/lib/types';

/**
 * Structure in, argument out (§6).
 *
 * This is the step the product is judged by, and it is cheap — it is text. Its
 * whole purpose is to be wrong in a way that takes ten seconds to fix, rather
 * than fourteen rendered slides that take an afternoon.
 */
export const OUTLINE_SYSTEM = `You turn a structured note into the argument for a deck. You produce an outline, never slides.

For each slide give:
- claim: the one sentence that slide is making. A claim, not a label. "Migration slipped because two teams share one environment" — not "Migration status".
- support: two to four points underneath it, from the note.
- shape: one of the seven below, and no others.

The shapes:
- title: the opening slide. Exactly one, first. Its claim is the deck's argument in a sentence.
- contents: what the deck covers. Use only if there are more than six slides after it.
- statement: one claim, large, alone. For the thing the room must not miss. At most one or two in a deck.
- bullets: a claim with points underneath. The workhorse.
- two-column: a comparison or a before-and-after. Every support item must be "left || right" — a pair per row, in that exact form.
- chart: one simple bar or line. Every support item must be "Label: number" — nothing else. Use only where the note gives real figures. Never invent figures to justify a chart.
- next-steps: what happens now. At most one, last. Each item an action, "Owner — action — when" where the note supplies those.

Rules:

1. Invent nothing. Every claim and every support point comes from the note. If the note does not support a slide, there is no slide.
2. Between six and twelve slides for an ordinary note, fewer for a thin one. A short honest deck beats a padded one.
3. Order it as an argument: what is happening, why it matters, what follows. Put the risk before the ask.
4. If the note leaves something open, that is a slide with the question on it — not a slide that quietly resolves it.
5. Use their vocabulary, their acronyms and their numbers exactly as given.`;

export function outlineUser(structure: Structure, ask: string): string {
  const s = structure;
  return [
    `Title: ${s.title}`,
    ``,
    `Points:`,
    ...s.points.map((p) => `- ${p}`),
    ``,
    s.questions.length ? `Open questions:\n${s.questions.map((q) => `- ${q}`).join('\n')}` : '',
    s.next ? `\nNext step they named: ${s.next}` : '',
    s.mentions.length ? `\nNamed in the note: ${s.mentions.join(', ')}` : '',
    ask.trim() ? `\nWhat this deck is for: ${ask.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
