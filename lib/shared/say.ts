import { friendly } from '@/lib/friendly';
import { NotAllowed, Stale } from './client';

/**
 * What to say when a change did not happen.
 *
 * One sentence in one place, for the reason the broadcast confirmation is one
 * function in one place: a message about what happened has to be derived from
 * what happened. Four screens each writing their own version is four chances
 * for one of them to say "saved" after a refusal — which is the exact fault
 * this codebase has already shipped once.
 *
 * Every one of these begins by saying nothing changed, before saying why. The
 * why is useful; the first four words are the part somebody acts on.
 */
export function refusal(err: unknown): string {
  if (err instanceof NotAllowed) {
    return 'Nothing changed. This needs the admin code — there is a box for it at the top of the Admin screen.';
  }
  if (err instanceof Stale) {
    return 'Nothing changed. Somebody else edited this while you had it open, and this screen now shows theirs.';
  }
  return `Nothing changed. ${friendly(err).message}`;
}
