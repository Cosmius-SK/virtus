import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderWsr } from '@/lib/deck/wsr';
import type { Wsr } from '@/lib/types';

/**
 * The same rule as test/render.test.ts, on a different format: what the note
 * did not say must not appear on the slide.
 *
 * A status one-pager is read by people who decide things on it. An invented
 * owner, a date nobody gave, or a risk table quietly dropped because it was
 * empty are all worse than a blank box — a blank box is information.
 */

const BARE: Wsr = {
  title: 'A programme',
  projectId: '',
  projectName: '',
  startDate: '',
  endDate: '',
  status: 'In Progress',
  executiveSummary: '',
  keyDecisions: [],
  accomplishments: [],
  upcoming: [],
  risks: [],
};

async function open(wsr: Wsr): Promise<string[]> {
  const zip = await JSZip.loadAsync(await renderWsr(wsr));
  const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
  return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
}

/** The furniture of the format: labels, the legend, an empty cell's dash. */
const CHROME = new Set([
  '',
  '—',
  'None raised',
  'Internal',
  'Executive Summary',
  'Key Decisions',
  'Key Accomplishments',
  'Upcoming Activities',
  'Key Risks / Challenges',
  'Impact',
  'Raised',
  'Owner',
  'Mitigation Plan',
  'Expected closure',
  'Project ID',
  'Project Name',
  'Start Date',
  'End Date',
  'Status',
  'On Track',
  'In Progress',
  'Completed',
  'At Risk',
  'Delayed',
]);

function suppliedBy(wsr: Wsr): Set<string> {
  return new Set([
    wsr.title,
    wsr.projectId,
    wsr.projectName,
    wsr.startDate,
    wsr.endDate,
    wsr.status,
    wsr.executiveSummary,
    ...wsr.keyDecisions,
    ...wsr.accomplishments,
    ...wsr.upcoming,
    ...wsr.risks.flatMap((r) => Object.values(r)),
  ]);
}

describe('an empty field stays empty', () => {
  it('renders every section of a report with nothing in it', async () => {
    const text = await open(BARE);

    // A missing risk table reads as "no table", not as "no risks". The empty
    // table is the statement, so it is drawn either way.
    for (const heading of [
      'Executive Summary',
      'Key Decisions',
      'Key Accomplishments',
      'Upcoming Activities',
      'Key Risks / Challenges',
    ]) {
      expect(text).toContain(heading);
    }
  });

  it('says nothing was raised rather than inventing a risk', async () => {
    expect(await open(BARE)).toContain('None raised');
  });

  it('puts nothing on the slide that did not come from the note', async () => {
    const wsr: Wsr = {
      ...BARE,
      status: 'At Risk',
      risks: [
        {
          risk: 'Vendor has gone quiet',
          impact: 'Wave 3 may slip',
          raised: '',
          owner: '',
          mitigation: '',
          closure: '',
        },
      ],
    };

    const supplied = suppliedBy(wsr);
    const invented = (await open(wsr)).filter((t) => !CHROME.has(t) && !supplied.has(t));
    expect(invented).toEqual([]);
  });
});

describe('what the note did say survives', () => {
  it('carries the status onto the chip and the summary onto the slide', async () => {
    const text = await open({
      ...BARE,
      status: 'At Risk',
      executiveSummary: 'The December cutover is gone unless a second environment is approved.',
      accomplishments: ['Wave 1 completed', '34 of 52 interfaces migrated'],
    });

    expect(text).toContain('At Risk');
    expect(text).toContain('The December cutover is gone unless a second environment is approved.');
    expect(text).toContain('34 of 52 interfaces migrated');
  });
});
