import 'server-only';
import PptxGenJS from 'pptxgenjs';
import type { Outline, OutlineSlide } from '@/lib/types';
import { BRAND, chartSeries, FOOTER, GRID, MASTER } from './master';

/**
 * The approved outline becomes a real .pptx (§6).
 *
 * Rendering runs server-side, so the plugin gets it for free later (§7). The
 * file it produces stays fully editable in PowerPoint and Google Slides, which
 * matters more than it sounds: nobody will trust a tool whose output they
 * cannot fix by hand.
 *
 * Every shape degrades to bullets. A convention the model got slightly wrong
 * must never produce a broken slide — it produces a plainer one.
 */

type Slide = ReturnType<PptxGenJS['addSlide']>;

function deck(): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  // The theme fonts, not just the fonts on the text Virtus writes. A deck is
  // meant to be edited by hand afterwards, and a text box the person adds
  // themselves inherits these — left at the library's default it would come out
  // Calibri on an otherwise Trebuchet deck.
  pptx.theme = { headFontFace: BRAND.faceHeading, bodyFontFace: BRAND.face };
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: BRAND.paper },
    objects: [
      {
        line: {
          x: GRID.marginX,
          y: GRID.h - 0.52,
          w: GRID.bodyW,
          h: 0,
          line: { color: BRAND.rule, width: 0.75 },
        },
      },
      {
        text: {
          text: FOOTER,
          options: {
            x: GRID.marginX,
            y: GRID.h - 0.46,
            w: 4,
            h: 0.3,
            fontFace: BRAND.face,
            fontSize: 9,
            color: BRAND.muted,
          },
        },
      },
    ],
    slideNumber: {
      x: GRID.w - GRID.marginX - 0.5,
      y: GRID.h - 0.46,
      w: 0.5,
      h: 0.3,
      align: 'right',
      fontFace: BRAND.face,
      fontSize: 9,
      color: BRAND.muted,
    },
  });
  return pptx;
}

function heading(slide: Slide, text: string): void {
  slide.addText(text, {
    x: GRID.marginX,
    y: GRID.titleY,
    w: GRID.bodyW,
    h: 0.85,
    fontFace: BRAND.faceHeading,
    fontSize: 26,
    color: BRAND.ink,
    bold: false,
    valign: 'top',
    lineSpacingMultiple: 0.95,
  });
  slide.addText('', {
    x: GRID.marginX,
    y: GRID.bodyY - 0.22,
    w: 0.9,
    h: 0,
    line: { color: BRAND.accentLine, width: 2 },
  });
}

/** The workhorse, done properly first (§13.4). */
function bullets(slide: Slide, s: OutlineSlide): void {
  heading(slide, s.claim);
  slide.addText(
    s.support.map((text) => ({
      text,
      options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 10 },
    })),
    {
      x: GRID.marginX,
      y: GRID.bodyY,
      w: GRID.bodyW,
      h: GRID.bodyH,
      fontFace: BRAND.face,
      fontSize: 16,
      color: BRAND.ink,
      valign: 'top',
      lineSpacingMultiple: 1.15,
    },
  );
}

function title(slide: Slide, s: OutlineSlide, subtitle: string): void {
  slide.addText(s.claim, {
    x: GRID.marginX,
    y: 1.85,
    w: GRID.bodyW,
    h: 1.6,
    fontFace: BRAND.faceHeading,
    fontSize: 34,
    color: BRAND.ink,
    valign: 'top',
    lineSpacingMultiple: 1,
  });
  const under = subtitle || s.support[0] || '';
  if (under) {
    slide.addText(under, {
      x: GRID.marginX,
      y: 3.5,
      w: GRID.bodyW,
      h: 0.6,
      fontFace: BRAND.face,
      fontSize: 14,
      color: BRAND.muted,
    });
  }
  slide.addText('', {
    x: GRID.marginX,
    y: 1.6,
    w: 1.2,
    h: 0,
    line: { color: BRAND.accentLine, width: 3 },
  });
}

function contents(slide: Slide, s: OutlineSlide): void {
  heading(slide, s.claim);
  slide.addText(
    s.support.map((text, i) => ({
      text: `${i + 1}   ${text}`,
      options: { paraSpaceAfter: 12 },
    })),
    {
      x: GRID.marginX,
      y: GRID.bodyY,
      w: GRID.bodyW,
      h: GRID.bodyH,
      fontFace: BRAND.face,
      fontSize: 16,
      color: BRAND.ink,
      valign: 'top',
    },
  );
}

/** One claim, large, alone. For the thing the room must not miss. */
function statement(slide: Slide, s: OutlineSlide): void {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: GRID.w,
    h: GRID.h,
    fill: { color: BRAND.accentSofter },
  });
  slide.addText(s.claim, {
    x: GRID.marginX + 0.3,
    y: 1.5,
    w: GRID.bodyW - 0.6,
    h: 2.2,
    fontFace: BRAND.faceHeading,
    fontSize: 30,
    color: BRAND.ink,
    align: 'center',
    valign: 'middle',
    lineSpacingMultiple: 1.05,
  });
  if (s.support.length) {
    slide.addText(s.support.join('   ·   '), {
      x: GRID.marginX + 0.3,
      y: 3.7,
      w: GRID.bodyW - 0.6,
      h: 0.5,
      fontFace: BRAND.face,
      fontSize: 13,
      color: BRAND.muted,
      align: 'center',
    });
  }
}

/** Every support item is "left || right" — a pair per row. */
function twoColumn(slide: Slide, s: OutlineSlide): void {
  const rows = s.support.map((item) => item.split('||').map((p) => p.trim()));
  if (!rows.some((r) => r.length === 2)) return bullets(slide, s);

  heading(slide, s.claim);
  const colW = (GRID.bodyW - 0.4) / 2;
  const sides: [string[], string[]] = [[], []];
  for (const r of rows) {
    sides[0].push(r[0] ?? '');
    sides[1].push(r[1] ?? '');
  }
  sides.forEach((items, i) => {
    slide.addText(
      items.map((text) => ({
        text,
        options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 10 },
      })),
      {
        x: GRID.marginX + i * (colW + 0.4),
        y: GRID.bodyY,
        w: colW,
        h: GRID.bodyH,
        fontFace: BRAND.face,
        fontSize: 15,
        color: BRAND.ink,
        valign: 'top',
      },
    );
  });
  slide.addText('', {
    x: GRID.marginX + colW + 0.2,
    y: GRID.bodyY,
    w: 0,
    h: GRID.bodyH,
    line: { color: BRAND.rule, width: 0.75 },
  });
}

/**
 * One simple bar. Every support item is "Label: number".
 *
 * A chart the model could not supply real figures for falls back to bullets —
 * an invented number is the one output that is worse than none (§8.5).
 */
function chart(pptx: PptxGenJS, slide: Slide, s: OutlineSlide): void {
  const labels: string[] = [];
  const values: number[] = [];
  for (const item of s.support) {
    const at = item.lastIndexOf(':');
    if (at < 1) continue;
    const value = Number(item.slice(at + 1).replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(value)) continue;
    labels.push(item.slice(0, at).trim());
    values.push(value);
  }
  if (labels.length < 2) return bullets(slide, s);

  heading(slide, s.claim);
  slide.addChart(
    pptx.ChartType.bar,
    [{ name: s.claim.slice(0, 60), labels, values }],
    {
      x: GRID.marginX,
      y: GRID.bodyY,
      w: GRID.bodyW,
      h: GRID.bodyH,
      barDir: 'col',
      chartColors: chartSeries(),
      showLegend: false,
      showValue: true,
      dataLabelFontFace: BRAND.face,
      dataLabelFontSize: 11,
      dataLabelColor: BRAND.ink,
      catAxisLabelFontFace: BRAND.face,
      catAxisLabelFontSize: 11,
      catAxisLabelColor: BRAND.muted,
      valAxisHidden: true,
      catGridLine: { style: 'none' },
      valGridLine: { color: BRAND.rule, style: 'solid', size: 0.5 },
    },
  );
}

function nextSteps(slide: Slide, s: OutlineSlide): void {
  heading(slide, s.claim);
  s.support.forEach((item, i) => {
    const y = GRID.bodyY + i * 0.62;
    if (y > GRID.h - 1.1) return;
    slide.addShape('ellipse', {
      x: GRID.marginX,
      y: y + 0.04,
      w: 0.34,
      h: 0.34,
      fill: { color: BRAND.accentSoft },
    });
    slide.addText(String(i + 1), {
      x: GRID.marginX,
      y: y + 0.04,
      w: 0.34,
      h: 0.34,
      fontFace: BRAND.face,
      fontSize: 12,
      color: BRAND.accent,
      align: 'center',
      valign: 'middle',
    });
    slide.addText(item, {
      x: GRID.marginX + 0.5,
      y,
      w: GRID.bodyW - 0.5,
      h: 0.42,
      fontFace: BRAND.face,
      fontSize: 15,
      color: BRAND.ink,
      valign: 'middle',
    });
  });
}

function draw(pptx: PptxGenJS, s: OutlineSlide, subtitle: string): void {
  const slide = pptx.addSlide({ masterName: MASTER });
  switch (s.shape) {
    case 'title':
      return title(slide, s, subtitle);
    case 'contents':
      return contents(slide, s);
    case 'statement':
      return statement(slide, s);
    case 'two-column':
      return twoColumn(slide, s);
    case 'chart':
      return chart(pptx, slide, s);
    case 'next-steps':
      return nextSteps(slide, s);
    case 'bullets':
    default:
      return bullets(slide, s);
  }
}

/** Render only what they approved (§6.3). */
export async function renderDeck(outline: Outline): Promise<Buffer> {
  const pptx = deck();
  pptx.title = outline.title;
  for (const slide of outline.slides) draw(pptx, slide, outline.subtitle);
  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}

export function deckFilename(title: string): string {
  const stem = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  return `${stem || 'deck'}.pptx`;
}
