import type { Settings } from '@/lib/db';

export type Banner = NonNullable<Settings['banner']>;

export const TONES = [
  { id: 'info', label: 'Notice' },
  { id: 'warn', label: 'Warning' },
  { id: 'alert', label: 'Urgent' },
] as const;

export const EMPTY: Banner = { on: false, text: '', tone: 'info' };

/**
 * What to tell somebody after they press save.
 *
 * Its own function because the sentence was wrong, and wrong in the way that
 * hides a bug rather than showing one: the panel said "Saved. It is at the top
 * of the page." whatever had been saved. Somebody typing a message and pressing
 * save got that sentence, no banner, and no reason to think the tool had
 * misunderstood them — so the report came back as "the broadcast does not
 * display" rather than "the switch did nothing".
 *
 * The rule: never describe a state the caller did not put the thing into.
 */
export function savedMessage(banner: Banner): string {
  if (!banner.text.trim()) return 'Saved. There is no message, so nothing is shown.';
  return banner.on
    ? 'Saved. It is at the top of every screen now.'
    : 'Saved, and not being shown. Press “Show this banner” when you want it up.';
}

/** Whether the strip should appear at all. Read by the frame and the preview. */
export function isShowing(banner: Banner | undefined): banner is Banner {
  return !!banner?.on && banner.text.trim().length > 0;
}
