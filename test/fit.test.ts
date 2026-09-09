import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '@/lib/deck/format';
import { formatById } from '@/lib/formats/registry';
import type { FormatDoc } from '@/lib/formats/types';

/**
 * A slide has an edge and a document does not, so something has to give when a
 * section is longer than a page. The one answer that must never be given is
 * silence: a risk that was on the screen and is not in the file is how a risk
 * nobody was told about ends up in a document everybody signed.
 *
 * These drive the case the format's old fixed cap could not — a project with
 * more risks than the design expected.
 */
const format = formatById('weekly-status')!;

/** Eight risks, each with a word that appears nowhere else in the deck. */
function withRisks(n: number): FormatDoc {
  return {
    title: 'Atlas week 34',
    status: 'At Risk',
    reconcile: [],
    sections: {
      header: { projectId: 'NA', projectName: 'Atlas', startDate: '', endDate: '' },
      summary: 'The dry run beat its estimate; the supplier spec is late.',
      decisions: [],
      done: ['Dry run completed'],
      next: ['Wave 2'],
      risks: Array.from({ length: n }, (_, i) => ({
        risk: `Riskmarker${i}`,
        impact: 'An impact',
        raised: '12 Aug',
        owner: 'Ken Osei',
        mitigation: 'Being worked',
        closure: '19 Sep',
      })),
    },
  };
}

async function slides(doc: FormatDoc, overflow: 'continue' | 'fit') {
  const zip = await JSZip.loadAsync(await renderFormat(format, doc, { overflow }));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const xml = (await Promise.all(names.map((n) => zip.file(n)!.async('string')))).join('');
  return { count: names.length, xml };
}

describe('a section longer than the page', () => {
  it('puts every row in the file when told to continue', async () => {
    const { count, xml } = await slides(withRisks(8), 'continue');
    for (let i = 0; i < 8; i++) expect(xml).toContain(`Riskmarker${i}`);
    expect(count).toBeGreaterThan(1);

    // Paired: eight rows genuinely do not fit on one slide, so the line above
    // is a continuation slide carrying them and not a page that held all eight.
    const one = await slides(withRisks(8), 'fit');
    expect(one.count).toBe(1);
    expect(one.xml).not.toContain('Riskmarker7');
  });

  it('says how many were left off when told to keep one slide', async () => {
    const { count, xml } = await slides(withRisks(8), 'fit');
    expect(count).toBe(1);
    expect(xml).toMatch(/\+\d+ more/);
    // Paired: the rows that did fit are there, so the assertion above is about
    // the ones left off rather than a table that failed to draw at all.
    expect(xml).toContain('Riskmarker0');
  });

  it('needs no continuation when everything fits', async () => {
    const { count, xml } = await slides(withRisks(3), 'continue');
    expect(count).toBe(1);
    expect(xml).not.toMatch(/continued/);
    for (let i = 0; i < 3; i++) expect(xml).toContain(`Riskmarker${i}`);
  });
});

describe('type sized to the room it was given', () => {
  /**
   * The size used by the shape that holds a given word.
   *
   * Read per shape rather than as the smallest on the slide: the footer and the
   * status chips are fixed at seven point, so a slide-wide minimum answers a
   * question about them instead of about the section being tested.
   */
  async function sizeOfShapeContaining(doc: FormatDoc, word: string): Promise<number> {
    const { xml } = await slides(doc, 'fit');
    const shape = xml
      .split('<p:sp>')
      .slice(1)
      .find((part) => part.includes(`>${word}`) || part.includes(word));
    expect(shape, `no shape contains ${word}`).toBeTruthy();
    const size = shape!.match(/sz="(\d+)"/);
    expect(size, `no font size on the shape holding ${word}`).toBeTruthy();
    return Number(size![1]) / 100;
  }

  it('shrinks a long section rather than running it off its box', async () => {
    const short = withRisks(1);
    short.sections.summary = 'Ambergris.';
    const long = withRisks(1);
    long.sections.summary = `Ambergris. ${'the position not the activity. '.repeat(40)}`;

    const big = await sizeOfShapeContaining(short, 'Ambergris');
    const small = await sizeOfShapeContaining(long, 'Ambergris');
    expect(small).toBeLessThan(big);

    // Paired: the short one keeps a readable size rather than sitting at some
    // floor, so the line above is shrinking on demand and not shrinking always.
    expect(big).toBeGreaterThanOrEqual(9);
  });
});
