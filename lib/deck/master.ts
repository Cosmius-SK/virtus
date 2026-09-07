import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * One master, defined in code (§6).
 *
 * Deliberately NOT read from the company's existing .potx. That is a project of
 * its own and it is not what makes the demo land.
 *
 * The palette and typeface below are the firm's own, taken from the 2Q26
 * earnings presentation — see docs/brand.md for how they were derived and what
 * each one is for. This file is the only place they live: change a colour here
 * and every slide, in every shape, follows.
 */
export const MASTER = 'VIRTUS';

export interface Palette {
  /** The house green. The dominant colour of the firm's own decks. */
  accent: string;
  /** The second green, used on the firm's rules and outlines. */
  accentLine: string;
  /** Pale tints, for a panel that must sit behind text and stay readable. */
  accentSoft: string;
  accentSofter: string;
  ink: string;
  muted: string;
  rule: string;
  ruleSoft: string;
  paper: string;
  /**
   * Trebuchet MS, embedded in the firm's own deck in all four cuts. There is no
   * light cut, so headings are separated from body by size and colour rather
   * than weight.
   */
  face: string;
  faceHeading: string;
}

const DEFAULT: Palette = {
  accent: '0F7F40',
  accentLine: '008555',
  accentSoft: 'CCE6DD',
  accentSofter: 'EAF5F0',

  ink: '1A1A1A',
  muted: '6D6D6D',
  rule: 'DBDBDB',
  ruleSoft: 'EAEAEA',
  paper: 'FFFFFF',

  face: 'Trebuchet MS',
  faceHeading: 'Trebuchet MS',
};

/**
 * The palette in force for the request being served.
 *
 * A house style uploaded in the admin space lives on the device, so it arrives
 * with the render call. Two requests can be in flight at once on one server, so
 * this cannot be a module-level variable somebody assigns before rendering:
 * that is a race, and the way it fails is one firm's document coming out in
 * another firm's colours — wrong in a way that still opens, still looks
 * finished, and has already been sent.
 *
 * AsyncLocalStorage scopes it to the call instead, and the proxy below means
 * the eighty-odd places that read a colour did not have to learn about any of
 * this.
 */
const active = new AsyncLocalStorage<{ palette: Palette; series: string[] }>();

export const BRAND: Palette = new Proxy({} as Palette, {
  get: (_target, key) => (active.getStore()?.palette ?? DEFAULT)[key as keyof Palette],
  has: (_target, key) => key in DEFAULT,
  ownKeys: () => Reflect.ownKeys(DEFAULT),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

/** Run a render with a house style in force. Without one, the defaults stand. */
export function withHouse<T>(house: Partial<Palette> & { series?: string[] } | undefined, run: () => T): T {
  if (!house) return run();
  const { series, ...palette } = house;
  return active.run(
    { palette: { ...DEFAULT, ...palette }, series: series?.length ? series : [...DEFAULT_SERIES] },
    run,
  );
}

/**
 * Chart series, in order, from the firm's own charts: house green first, then
 * the deep blue it pairs with, then amber, then red for a negative. Only the
 * first is used today — the renderer draws one series — but the order is the
 * firm's and should be kept when more arrive.
 */
const DEFAULT_SERIES = ['0F7F40', '00497F', 'FBC150', 'EE2724', '008555'] as const;

export function chartSeries(): string[] {
  return active.getStore()?.series ?? [...DEFAULT_SERIES];
}

/** 16:9 is 10in x 5.625in. Every position below is in inches. */
export const GRID = {
  w: 10,
  h: 5.625,
  marginX: 0.62,
  titleY: 0.52,
  bodyY: 1.55,
  get bodyW() {
    return this.w - this.marginX * 2;
  },
  get bodyH() {
    return this.h - this.bodyY - 0.75;
  },
} as const;

export const FOOTER = process.env.VIRTUS_DECK_FOOTER ?? 'Internal';

export { STATUS, STATUS_NAMES, type StatusName } from './status';
