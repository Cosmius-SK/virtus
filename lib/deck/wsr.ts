import 'server-only';
import PptxGenJS from 'pptxgenjs';
import type { Wsr } from '@/lib/types';
import { BRAND, FOOTER, STATUS } from './master';

/**
 * The weekly status one-pager (a FORMAT, not a shape — see lib/types.ts).
 *
 * One slide, dense, laid out in named regions the way the firm's own template
 * is: a banner, the project row, an executive summary, decisions, then
 * accomplishments beside upcoming activities, then the risk table.
 *
 * Every region is drawn whether or not it has content. A status report with an
 * empty risk table is a statement — "nothing raised" — and quietly dropping the
 * section would turn that statement into an absence nobody notices.
 */

const W = 10;
const H = 5.625;
const M = 0.18;
const FULL = W - M * 2;

type Slide = ReturnType<PptxGenJS['addSlide']>;

/** A section banner: the green bar with its title in white. */
function bar(slide: Slide, text: string, x: number, y: number, w: number): void {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.26,
    fill: { color: BRAND.accent },
    color: 'FFFFFF',
    fontFace: BRAND.face,
    fontSize: 11,
    bold: true,
    align: 'left',
    valign: 'middle',
    margin: [0, 6, 0, 6],
  });
}

/** The white box under a banner. */
function box(slide: Slide, x: number, y: number, w: number, h: number): void {
  slide.addShape('rect', {
    x,
    y,
    w,
    h,
    fill: { color: 'FFFFFF' },
    line: { color: BRAND.rule, width: 0.75 },
  });
}

function lines(
  slide: Slide,
  items: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  max: number,
): void {
  const shown = items.slice(0, max);
  slide.addText(
    shown.length
      ? shown.map((text) => ({
          text,
          options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 2 },
        }))
      : [{ text: 'None raised', options: { italic: true, color: BRAND.muted } }],
    {
      x: x + 0.1,
      y: y + 0.04,
      w: w - 0.2,
      h: h - 0.08,
      fontFace: BRAND.face,
      fontSize: 9,
      color: BRAND.ink,
      valign: 'top',
      shrinkText: true,
    },
  );
}

export async function renderWsr(wsr: Wsr): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.theme = { headFontFace: BRAND.faceHeading, bodyFontFace: BRAND.face };
  pptx.title = wsr.title;

  const slide = pptx.addSlide();
  slide.background = { color: BRAND.paper };

  // Banner.
  slide.addText(wsr.title, {
    x: M,
    y: 0.12,
    w: FULL,
    h: 0.38,
    fill: { color: BRAND.accent },
    color: 'FFFFFF',
    fontFace: BRAND.faceHeading,
    fontSize: 15,
    bold: true,
    valign: 'middle',
    margin: [0, 8, 0, 8],
  });

  // Project row — a real table, so it stays editable as one.
  const head = ['Project ID', 'Project Name', 'Start Date', 'End Date', 'Status'];
  const cells = [wsr.projectId, wsr.projectName, wsr.startDate, wsr.endDate, wsr.status];
  const colW = [1.5, 3.6, 1.7, 1.7, 1.14];
  slide.addTable(
    [
      head.map((text) => ({
        text,
        options: {
          fill: { color: BRAND.accent },
          color: 'FFFFFF',
          bold: true,
          align: 'center' as const,
        },
      })),
      cells.map((text, i) => ({
        text: text || '—',
        options:
          i === 4
            ? {
                fill: { color: STATUS[wsr.status] },
                color: 'FFFFFF',
                bold: true,
                align: 'center' as const,
              }
            : { align: i === 0 ? ('left' as const) : ('center' as const) },
      })),
    ],
    {
      x: M,
      y: 0.56,
      w: FULL,
      colW,
      rowH: 0.24,
      fontFace: BRAND.face,
      fontSize: 9,
      color: BRAND.ink,
      border: { pt: 0.75, color: BRAND.rule },
      valign: 'middle',
    },
  );

  // Executive summary.
  bar(slide, 'Executive Summary', M, 1.12, FULL);
  box(slide, M, 1.38, FULL, 0.5);
  slide.addText(wsr.executiveSummary || '—', {
    x: M + 0.1,
    y: 1.4,
    w: FULL - 0.2,
    h: 0.46,
    fontFace: BRAND.face,
    fontSize: 9,
    color: BRAND.ink,
    valign: 'top',
    shrinkText: true,
  });

  // Key decisions.
  bar(slide, 'Key Decisions', M, 1.96, FULL);
  box(slide, M, 2.22, FULL, 0.72);
  lines(slide, wsr.keyDecisions, M, 2.22, FULL, 0.72, 5);

  // Accomplishments beside upcoming activities.
  const halfW = (FULL - 0.14) / 2;
  const rightX = M + halfW + 0.14;
  bar(slide, 'Key Accomplishments', M, 3.02, halfW);
  box(slide, M, 3.28, halfW, 0.76);
  lines(slide, wsr.accomplishments, M, 3.28, halfW, 0.76, 5);

  bar(slide, 'Upcoming Activities', rightX, 3.02, halfW);
  box(slide, rightX, 3.28, halfW, 0.76);
  lines(slide, wsr.upcoming, rightX, 3.28, halfW, 0.76, 5);

  // Risks.
  const riskHead = [
    'Key Risks / Challenges',
    'Impact',
    'Raised',
    'Owner',
    'Mitigation Plan',
    'Expected closure',
  ];
  const riskW = [2.1, 1.9, 0.8, 0.85, 2.4, 1.59];
  const shown = wsr.risks.slice(0, 3);
  const rows = shown.length
    ? shown.map((r) => [r.risk, r.impact, r.raised, r.owner, r.mitigation, r.closure])
    : [['None raised', '', '', '', '', '']];

  slide.addTable(
    [
      riskHead.map((text) => ({
        text,
        options: { fill: { color: BRAND.accent }, color: 'FFFFFF', bold: true },
      })),
      ...rows.map((row) => row.map((text) => ({ text: text || '—', options: {} }))),
    ],
    {
      x: M,
      y: 4.12,
      w: FULL,
      colW: riskW,
      rowH: 0.22,
      fontFace: BRAND.face,
      fontSize: 8,
      color: BRAND.ink,
      border: { pt: 0.75, color: BRAND.rule },
      valign: 'middle',
      autoPage: false,
    },
  );

  // Footer: the confidentiality line, and the legend that makes the chip mean
  // something to a reader who has not seen one before.
  slide.addText(FOOTER, {
    x: M,
    y: H - 0.34,
    w: 4,
    h: 0.22,
    fontFace: BRAND.face,
    fontSize: 7,
    color: BRAND.muted,
    valign: 'middle',
  });
  let lx = W - M - 4.2;
  for (const [name, colour] of Object.entries(STATUS)) {
    slide.addText(name, {
      x: lx,
      y: H - 0.34,
      w: 0.82,
      h: 0.22,
      fill: { color: colour },
      color: 'FFFFFF',
      fontFace: BRAND.face,
      fontSize: 7,
      align: 'center',
      valign: 'middle',
    });
    lx += 0.86;
  }

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}
