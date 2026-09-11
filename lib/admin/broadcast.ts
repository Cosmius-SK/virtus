/**
 * What the firm is being told right now.
 *
 * This started as one banner with a switch. It is a list because the honest
 * answer to "is there a notice up?" is rarely one thing: a trial run, a change
 * freeze and an outage can all be true on the same Tuesday, and an admin who
 * can only hold one of them will delete the one that still matters to post the
 * one that just happened.
 *
 * Three things here are not decoration:
 *
 * - **Dates end a notice without anybody remembering to.** The failure mode of
 *   a broadcast is not that it never appears, it is that it never leaves. A
 *   strip still announcing last month's freeze teaches everyone to stop reading
 *   the strip, and then the outage notice lands on a bar nobody looks at.
 * - **The internal note never reaches the strip.** It is for the admin: who
 *   asked for this, why, and when it can go. It is the difference between a
 *   list somebody can maintain and a list nobody dares delete from.
 * - **A phase is derived, never stored.** `showing` is computed from the switch,
 *   the text and today's date every time it is asked for. A stored flag would
 *   drift from the dates the moment a day passed with nobody looking.
 */

export type Tone = 'info' | 'warn' | 'alert';

export interface Broadcast {
  id: string;
  /** What everybody reads. */
  text: string;
  tone: Tone;
  /** Whether the admin has it switched on at all. Dates narrow this; they never widen it. */
  on: boolean;
  /** First day it may show, inclusive, as YYYY-MM-DD. Empty means "from now". */
  from?: string;
  /** Last day it may show, inclusive. Empty means "until somebody stops it". */
  until?: string;
  /** Why it exists, who asked for it, what ends it. Admin only — never rendered. */
  note?: string;
  /** Order of addition. The strip reads in this order, so it is the running order. */
  addedAt: number;
}

export type Phase = 'showing' | 'scheduled' | 'ended' | 'off';

export const TONES = [
  { id: 'info', label: 'Notice' },
  { id: 'warn', label: 'Warning' },
  { id: 'alert', label: 'Urgent' },
] as const;

/** How many may be live at once. More than this and the strip stops being read. */
export const LIMIT = 6;

/** How many ended ones are kept for the record, newest first. */
export const ARCHIVE = 6;

/**
 * The longest a message may be. A marquee is a queue: every extra character is
 * time the next message spends off-screen, so the cost of a long one is paid by
 * the one after it.
 */
export const MAX_TEXT = 200;

const RANK: Record<Tone, number> = { info: 0, warn: 1, alert: 2 };

/** Today, as the admin's own calendar sees it. Dates here are days, not instants. */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function blank(now: number = Date.now()): Broadcast {
  return { id: crypto.randomUUID(), text: '', tone: 'info', on: false, addedAt: now };
}

/**
 * Where a message stands. Order matters: a message whose last day has passed is
 * archived even if the switch was left on, because the date is the thing the
 * admin set deliberately and the switch is the thing they forgot.
 */
export function phaseOf(b: Broadcast, t: string = today()): Phase {
  if (!b.text.trim()) return 'off';
  if (b.until && b.until < t) return 'ended';
  if (!b.on) return 'off';
  if (b.from && b.from > t) return 'scheduled';
  return 'showing';
}

const byAddition = (a: Broadcast, b: Broadcast) => a.addedAt - b.addedAt;

/** What the strip shows, in the order they were added. */
export function live(list: Broadcast[], t: string = today()): Broadcast[] {
  return list.filter((b) => phaseOf(b, t) === 'showing').sort(byAddition);
}

/** Everything still in play: showing, scheduled, or written and switched off. */
export function active(list: Broadcast[], t: string = today()): Broadcast[] {
  return list.filter((b) => phaseOf(b, t) !== 'ended').sort(byAddition);
}

/** Ended, newest first, because the useful one is the one that just went. */
export function archived(list: Broadcast[], t: string = today()): Broadcast[] {
  return list.filter((b) => phaseOf(b, t) === 'ended').sort((a, b) => b.addedAt - a.addedAt);
}

export function canAdd(list: Broadcast[], t: string = today()): boolean {
  return active(list, t).length < LIMIT;
}

/**
 * What gets written back. Active messages are all kept — the limit is enforced
 * where somebody presses "add", not here, so a save can never be the thing that
 * silently drops a notice. The archive is capped, and drops the oldest.
 */
export function trim(list: Broadcast[], t: string = today()): Broadcast[] {
  return [...active(list, t), ...archived(list, t).slice(0, ARCHIVE)];
}

/** The strip takes the colour of the most serious thing in it. */
export function mostSevere(items: Broadcast[]): Tone {
  return items.reduce<Tone>((worst, b) => (RANK[b.tone] > RANK[worst] ? b.tone : worst), 'info');
}

/** Why this one cannot be saved yet, said in a sentence, or null. */
export function problemWith(b: Broadcast): string | null {
  if (b.from && b.until && b.from > b.until) return 'The last day is before the first day.';
  if (b.text.trim().length > MAX_TEXT) {
    return `That is ${b.text.trim().length} characters. Keep it under ${MAX_TEXT} — everything after it in the strip waits for it to scroll past.`;
  }
  return null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * A date, written out. Spelled here rather than through `toLocaleDateString`
 * because this sentence is part of the product's voice and must read the same
 * on every machine — and because a confirmation whose wording depends on the
 * reader's locale cannot be held to a test.
 */
function saidDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

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
 * Dates gave the sentence two more ways to be false, and both are the same
 * mistake: a message saved for next Monday is not up, and a message whose last
 * day was yesterday is not up either. The rule holds — never describe a state
 * the caller did not put the thing into.
 */
export function savedMessage(b: Broadcast, list: Broadcast[] = [b], t: string = today()): string {
  if (!b.text.trim()) return 'Saved. There is no message, so nothing is shown.';

  switch (phaseOf(b, t)) {
    case 'ended':
      return `Saved. Its last day was ${saidDate(b.until as string)}, so it is archived and not shown.`;
    case 'scheduled':
      return `Saved. It starts on ${saidDate(b.from as string)} and is not shown until then.`;
    case 'off':
      return 'Saved, and not being shown. Press “Show this message” when you want it up.';
    case 'showing': {
      const order = live(list, t);
      const place = order.findIndex((x) => x.id === b.id) + 1;
      return order.length > 1 && place > 0
        ? `Saved. It is in the strip at the top of every screen now, ${place} of ${order.length}.`
        : 'Saved. It is in the strip at the top of every screen now.';
    }
  }
}

/**
 * The list, read from whatever the device happens to hold.
 *
 * A device that used the single-banner version still has that record, and it
 * may be a notice somebody put up and expects to see. It is folded in rather
 * than migrated: reading is where the two shapes meet, so nothing has to be
 * rewritten before it can be read, and the first save writes the new shape.
 */
export interface HoldsBroadcasts {
  broadcasts?: Broadcast[];
  banner?: { on: boolean; text: string; tone: Tone };
  updatedAt?: number;
}

export function broadcastsOf(settings: HoldsBroadcasts | undefined): Broadcast[] {
  if (settings?.broadcasts) return [...settings.broadcasts].sort(byAddition);
  const old = settings?.banner;
  if (!old?.text?.trim()) return [];
  return [
    {
      id: 'legacy-banner',
      text: old.text,
      tone: old.tone,
      on: old.on,
      note: 'Carried over from the single-banner version.',
      addedAt: settings?.updatedAt ?? 0,
    },
  ];
}
