import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderDeck } from '@/lib/deck/render';
import { SHAPES, type Outline, type OutlineSlide } from '@/lib/types';

/**
 * These test one thing: that a slide shape which cannot be honoured degrades to
 * bullets rather than being faked.
 *
 * That is not a cosmetic concern. "Nothing invented" (§8.5) is the rule this
 * product lives by — a deck with a number nobody said is the one output worse
 * than no deck at all, because it gets sent to a client. The fallback branches
 * in lib/deck/render.ts are where that rule is enforced, and they fail silently
 * when they fail: the file still opens, it is just wrong.
 *
 * Deliberately NOT tested here: anything that calls the model (a different
 * answer every run, real money, and flaky), and anything about visual layout
 * (every design tweak would break it, and tests people learn to ignore are
 * worse than no tests).
 */

/** Slide parts in the order PowerPoint shows them. */
function slideNames(names: string[]): string[] {
  return names
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
}

function slide(part: Partial<OutlineSlide> & Pick<OutlineSlide, 'shape'>): OutlineSlide {
  return { claim: 'A claim', support: [], ...part };
}

function outline(...slides: OutlineSlide[]): Outline {
  return { title: 'Test deck', subtitle: 'Subtitle', slides };
}

/**
 * Open the rendered file the way PowerPoint would.
 *
 * Chart parts are found by prefix, never by name: pptxgenjs numbers them from a
 * counter that is global to the module, so the second deck rendered in one
 * process contains chart2.xml rather than chart1.xml.
 */
async function open(deck: Outline) {
  const zip = await JSZip.loadAsync(await renderDeck(deck));
  const names = Object.keys(zip.files);
  const chartPart = names.find((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  return {
    names,
    hasChart: chartPart !== undefined,
    slideCount: names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length,
    /** Every value written into the chart, as it appears in the file. */
    async chartValues(): Promise<string[]> {
      if (!chartPart) return [];
      const xml = await zip.file(chartPart)!.async('string');
      return [...xml.matchAll(/<c:v>([^<]*)<\/c:v>/g)].map((m) => m[1]);
    },
    /** How many drawn shapes each slide carries, in order. */
    async shapeCounts(): Promise<number[]> {
      const out: number[] = [];
      for (const name of slideNames(names)) {
        const xml = await zip.file(name)!.async('string');
        out.push([...xml.matchAll(/<p:sp>/g)].length + [...xml.matchAll(/<p:graphicFrame>/g)].length);
      }
      return out;
    },
    /** The visible text of every slide, in order. */
    async text() {
      const out: string[] = [];
      for (const name of slideNames(names)) {
        const xml = await zip.file(name)!.async('string');
        out.push([...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('\n'));
      }
      return out;
    },
  };
}

describe('a chart is never invented', () => {
  it('drops to bullets when the support has no figures in it', async () => {
    const deck = await open(
      outline(
        slide({
          shape: 'chart',
          claim: 'We are behind',
          support: ['Quite a lot', 'More than we thought'],
        }),
      ),
    );

    expect(deck.hasChart).toBe(false);
    // The words survive — nothing is dropped, it is only shaped differently.
    expect((await deck.text())[0]).toContain('Quite a lot');
    expect((await deck.text())[0]).toContain('More than we thought');
  });

  it('drops to bullets when only one figure can be read', async () => {
    // One bar is not a chart. Two is the minimum that says anything.
    const deck = await open(
      outline(slide({ shape: 'chart', support: ['Migrated: 34', 'The rest are stuck'] })),
    );

    expect(deck.hasChart).toBe(false);
  });

  it('renders a chart when the figures are real, using exactly those figures', async () => {
    const deck = await open(
      outline(
        slide({
          shape: 'chart',
          claim: 'Interface migration has stalled',
          support: ['Migrated: 34', 'In test: 11', 'Not started: 7'],
        }),
      ),
    );

    expect(deck.hasChart).toBe(true);

    const values = await deck.chartValues();
    expect(values).toContain('34');
    expect(values).toContain('11');
    expect(values).toContain('7');
    // And nothing that was not in the note. This is the assertion that matters:
    // a bar with a number nobody said is the failure this whole file exists for.
    const numbers = values.filter((v) => /^-?\d+(\.\d+)?$/.test(v));
    expect(numbers.sort()).toEqual(['11', '34', '7']);
  });
});

describe('a two-column slide is never half-built', () => {
  it('drops to bullets when no row carries the || separator', async () => {
    const support = ['Just a point', 'Another point'];

    // Rendered side by side: a two-column slide that cannot be built must come
    // out *identical* to the bullets slide it degrades into. Comparing against a
    // real bullets slide, rather than asserting a shape count, keeps this test
    // honest when the bullets layout changes — it is checking the fallback, not
    // the design.
    const degraded = await open(
      outline(slide({ shape: 'two-column', claim: 'A claim', support })),
    );
    const plain = await open(outline(slide({ shape: 'bullets', claim: 'A claim', support })));

    expect(await degraded.shapeCounts()).toEqual(await plain.shapeCounts());
    expect(await degraded.text()).toEqual(await plain.text());
  });

  it('splits each row on || and keeps both halves', async () => {
    const deck = await open(
      outline(
        slide({
          shape: 'two-column',
          support: ['Assumed: one weekend || Found: three', 'Assumed: 40 || Found: 52'],
        }),
      ),
    );

    const text = (await deck.text())[0];
    expect(text).toContain('Assumed: one weekend');
    expect(text).toContain('Found: three');
    // The separator itself must never reach a slide.
    expect(text).not.toContain('||');
  });
});

describe('the file itself', () => {
  it('renders all seven shapes into one openable deck', async () => {
    const deck = await open(
      outline(
        ...SHAPES.map((shape) =>
          slide({
            shape,
            claim: `A ${shape} slide`,
            support:
              shape === 'chart'
                ? ['One: 1', 'Two: 2']
                : shape === 'two-column'
                  ? ['left || right']
                  : ['A point', 'Another point'],
          }),
        ),
      ),
    );

    expect(deck.slideCount).toBe(SHAPES.length);
    // The parts PowerPoint refuses to open a file without.
    expect(deck.names).toContain('[Content_Types].xml');
    expect(deck.names).toContain('ppt/presentation.xml');
    expect(deck.names.some((n) => n.startsWith('ppt/slideMasters/'))).toBe(true);
  });

  it('carries every claim through to the slide it belongs to', async () => {
    const deck = await open(
      outline(
        slide({ shape: 'title', claim: 'First claim' }),
        slide({ shape: 'bullets', claim: 'Second claim', support: ['A point'] }),
        slide({ shape: 'statement', claim: 'Third claim' }),
      ),
    );

    const text = await deck.text();
    expect(text[0]).toContain('First claim');
    expect(text[1]).toContain('Second claim');
    expect(text[2]).toContain('Third claim');
  });
});
