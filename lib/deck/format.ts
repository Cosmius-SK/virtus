import 'server-only';
import PptxGenJS from 'pptxgenjs';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';
import { BRAND, FOOTER, STATUS } from './master';

/**
 * One renderer for every format (see lib/formats/types.ts).
 *
 * Sections stack down the slide in the order the format declares them, except
 * where one is marked `beside` and shares a row with the next. Declared heights
 * are normalised to fit, so a format that asks for more than a slide holds
 * comes out tight rather than off the bottom edge.
 *
 * Every section is drawn whether or not it has content. An empty risk table is
 * a statement — nothing raised — and dropping it turns that statement into an
 * absence nobody notices.
 */

const W = 10;
const H = 5.625;
const M = 0.18;
const FULL = W - M * 2;
const BANNER_H = 0.38;
const BAR_H = 0.26;
const FOOTER_H = 0.42;
const GAP = 0.08;

type Slide = ReturnType<PptxGenJS['addSlide']>;

/** Rows of sections: a `beside` section pairs with the one after it. */
function rows(sections: Section[]): Section[][] {
  const out: Section[][] = [];
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].beside && sections[i + 1]) {
      out.push([sections[i], sections[i + 1]]);
      i++;
    } else {
      out.push([sections[i]]);
    }
  }
  return out;
}

function bar(slide: Slide, text: string, x: number, y: number, w: number): void {
  slide.addText(text, {
    x,
    y,
    w,
    h: BAR_H,
    fill: { color: BRAND.accent },
    color: 'FFFFFF',
    fontFace: BRAND.face,
    fontSize: 11,
    bold: true,
    valign: 'middle',
    margin: [0, 6, 0, 6],
  });
}

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

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asRows(value: unknown): Record<string, string>[] {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, string> => !!v && typeof v === 'object')
    : [];
}

function drawParagraph(slide: Slide, s: Section, v: unknown, x: number, y: number, w: number, h: number) {
  bar(slide, s.label, x, y, w);
  box(slide, x, y + BAR_H, w, h);
  slide.addText(typeof v === 'string' && v.trim() ? v : '—', {
    x: x + 0.1,
    y: y + BAR_H + 0.03,
    w: w - 0.2,
    h: h - 0.06,
    fontFace: BRAND.face,
    fontSize: 9,
    color: BRAND.ink,
    valign: 'top',
    shrinkText: true,
  });
}

function drawList(slide: Slide, s: Section, v: unknown, x: number, y: number, w: number, h: number) {
  bar(slide, s.label, x, y, w);
  box(slide, x, y + BAR_H, w, h);
  const items = asStrings(v).slice(0, s.max ?? 6);
  slide.addText(
    items.length
      ? items.map((text) => ({
          text,
          options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 2 },
        }))
      : [{ text: 'None', options: { italic: true, color: BRAND.muted } }],
    {
      x: x + 0.1,
      y: y + BAR_H + 0.03,
      w: w - 0.2,
      h: h - 0.06,
      fontFace: BRAND.face,
      fontSize: 9,
      color: BRAND.ink,
      valign: 'top',
      shrinkText: true,
    },
  );
}

function drawTable(slide: Slide, s: Section, v: unknown, x: number, y: number, w: number, h: number) {
  const cols = s.columns ?? [];
  if (!cols.length) return drawList(slide, s, v, x, y, w, h);

  // A table carries its own column headers, but those name the columns, not the
  // section. A format with two tables — a RAID log has Risks and Issues — needs
  // the section named or the reader cannot tell them apart. So the bar goes
  // above every section, table or not.
  bar(slide, s.label, x, y, w);

  const total = cols.reduce((n, c) => n + c.width, 0);
  const colW = cols.map((c) => (c.width / total) * w);
  const data = asRows(v).slice(0, s.max ?? 4);
  const body = data.length
    ? data.map((row) => cols.map((c) => ({ text: row[c.id] || '—', options: {} })))
    : [cols.map((_, i) => ({ text: i === 0 ? 'None' : '—', options: {} }))];

  slide.addTable(
    [
      cols.map((c) => ({
        text: c.label,
        options: { fill: { color: BRAND.accentLine }, color: 'FFFFFF', bold: true },
      })),
      ...body,
    ],
    {
      x,
      y: y + BAR_H,
      w,
      colW,
      rowH: Math.max(0.18, h / (body.length + 1) - 0.01),
      fontFace: BRAND.face,
      fontSize: 8,
      color: BRAND.ink,
      border: { pt: 0.75, color: BRAND.rule },
      valign: 'middle',
      autoPage: false,
    },
  );
}

function drawFields(slide: Slide, s: Section, v: unknown, doc: FormatDoc, format: FormatDef, x: number, y: number, w: number) {
  const fields = s.fields ?? [];
  const values = (v ?? {}) as Record<string, string>;
  const cells = [...fields.map((f) => ({ label: f.label, value: values[f.id] || '—', width: f.width }))];
  if (format.status) cells.push({ label: 'Status', value: doc.status, width: 1.2 });

  const total = cells.reduce((n, c) => n + c.width, 0);
  slide.addTable(
    [
      cells.map((c) => ({
        text: c.label,
        options: { fill: { color: BRAND.accent }, color: 'FFFFFF', bold: true, align: 'center' as const },
      })),
      cells.map((c, i) => ({
        text: c.value,
        options:
          format.status && i === cells.length - 1
            ? {
                fill: { color: STATUS[doc.status] ?? BRAND.muted },
                color: 'FFFFFF',
                bold: true,
                align: 'center' as const,
              }
            : { align: 'center' as const },
      })),
    ],
    {
      x,
      y,
      w,
      colW: cells.map((c) => (c.width / total) * w),
      rowH: 0.24,
      fontFace: BRAND.face,
      fontSize: 9,
      color: BRAND.ink,
      border: { pt: 0.75, color: BRAND.rule },
      valign: 'middle',
    },
  );
}

export async function renderFormat(format: FormatDef, doc: FormatDoc): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.theme = { headFontFace: BRAND.faceHeading, bodyFontFace: BRAND.face };
  pptx.title = doc.title;

  const slide = pptx.addSlide();
  slide.background = { color: BRAND.paper };

  slide.addText(doc.title, {
    x: M,
    y: 0.12,
    w: FULL,
    h: BANNER_H,
    fill: { color: BRAND.accent },
    color: 'FFFFFF',
    fontFace: BRAND.faceHeading,
    fontSize: 15,
    bold: true,
    valign: 'middle',
    margin: [0, 8, 0, 8],
  });

  const laid = rows(format.sections);

  // Normalise so the declared heights fit the slide rather than run off it.
  const available = H - (0.12 + BANNER_H + GAP) - FOOTER_H;
  const asked = laid.reduce(
    (n, row) => n + Math.max(...row.map((s) => s.height)) + (row[0].kind === 'fields' ? 0 : BAR_H) + GAP,
    0,
  );
  const scale = asked > available ? available / asked : 1;

  let y = 0.12 + BANNER_H + GAP;
  for (const row of laid) {
    const rowH = Math.max(...row.map((s) => s.height)) * scale;
    const isFields = row[0].kind === 'fields';
    const each = row.length === 2 ? (FULL - 0.14) / 2 : FULL;

    row.forEach((section, i) => {
      const x = M + i * (each + 0.14);
      const value = doc.sections[section.id];
      switch (section.kind) {
        case 'paragraph':
          return drawParagraph(slide, section, value, x, y, each, rowH);
        case 'list':
          return drawList(slide, section, value, x, y, each, rowH);
        case 'table':
          return drawTable(slide, section, value, x, y, each, rowH);
        case 'fields':
          return drawFields(slide, section, value, doc, format, x, y, each);
      }
    });

    y += rowH + (isFields ? 0 : BAR_H) + GAP;
  }

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

  if (format.status) {
    const chipW = 0.72;
    let lx = W - M - Object.keys(STATUS).length * (chipW + 0.04);
    for (const [name, colour] of Object.entries(STATUS)) {
      slide.addText(name, {
        x: lx,
        y: H - 0.34,
        w: chipW,
        h: 0.22,
        fill: { color: colour },
        color: 'FFFFFF',
        fontFace: BRAND.face,
        fontSize: 7,
        align: 'center',
        valign: 'middle',
      });
      lx += chipW + 0.04;
    }
  }

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}
