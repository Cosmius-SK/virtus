import 'server-only';
import PptxGenJS from 'pptxgenjs';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';
import { fitSize, linesFor, linesForList, linesForRow, lineHeightIn, neededIn } from './fit';
import { BRAND, FOOTER } from './master';
import { STATUS } from './status';

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

/**
 * The size text starts at, and the size below which it is not worth shrinking.
 *
 * Below the floor a slide stops being presentable — six point on a projector is
 * a paragraph nobody in the third row can read — so past that point the answer
 * is fewer rows, not smaller type.
 */
const NOMINAL = { paragraph: 9.5, list: 9.5, table: 8.5 } as const;
const FLOOR = 7;

/**
 * What happens to content that will not fit on the page.
 *
 * `continue` puts it on another slide, `fit` keeps one page and says how much
 * was left off. Never silence: a risk that vanished between the screen and the
 * file is the worst thing this renderer could do.
 */
export type Overflow = 'continue' | 'fit';

/** What a section could not fit, so the caller can decide where it goes. */
interface Left {
  section: Section;
  items: string[];
  rows: Record<string, string>[];
}

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
  const text = typeof v === 'string' && v.trim() ? v : '—';
  // Sized to the room it was given rather than to a constant, because the room
  // it was given already accounts for how much there is to say.
  const size = fitSize((pt) => linesFor(text, w, pt), h - 0.06, NOMINAL.paragraph, FLOOR);
  slide.addText(text, {
    x: x + 0.1,
    y: y + BAR_H + 0.03,
    w: w - 0.2,
    h: h - 0.06,
    fontFace: BRAND.face,
    fontSize: size,
    color: BRAND.ink,
    valign: 'top',
    shrinkText: true,
  });
}

function drawList(
  slide: Slide,
  s: Section,
  v: unknown,
  x: number,
  y: number,
  w: number,
  h: number,
): Left | null {
  bar(slide, s.label, x, y, w);
  box(slide, x, y + BAR_H, w, h);
  const all = asStrings(v);
  const inner = h - 0.06;
  const size = fitSize((pt) => linesForList(all, w, pt), inner, NOMINAL.list, FLOOR);

  // At the floor, the answer is fewer items rather than smaller type. Take as
  // many as the box holds and hand the rest back.
  let shown = all;
  let left: string[] = [];
  if (linesForList(all, w, size) * lineHeightIn(size) > inner) {
    shown = [];
    let used = 0;
    for (const item of all) {
      const cost = linesForList([item], w, size) * lineHeightIn(size);
      if (used + cost > inner) break;
      shown.push(item);
      used += cost;
    }
    left = all.slice(shown.length);
  }

  slide.addText(
    shown.length
      ? shown.map((text) => ({
          text,
          options: { bullet: { characterCode: '2022' }, paraSpaceAfter: 2 },
        }))
      : [{ text: 'None', options: { italic: true, color: BRAND.muted } }],
    {
      x: x + 0.1,
      y: y + BAR_H + 0.03,
      w: w - 0.2,
      h: inner,
      fontFace: BRAND.face,
      fontSize: size,
      color: BRAND.ink,
      valign: 'top',
      shrinkText: true,
    },
  );

  return left.length ? { section: s, items: left, rows: [] } : null;
}

function drawTable(
  slide: Slide,
  s: Section,
  v: unknown,
  x: number,
  y: number,
  w: number,
  h: number,
  overflow: Overflow,
): Left | null {
  const cols = s.columns ?? [];
  if (!cols.length) return drawList(slide, s, v, x, y, w, h);

  // A table carries its own column headers, but those name the columns, not the
  // section. A format with two tables — a RAID log has Risks and Issues — needs
  // the section named or the reader cannot tell them apart. So the bar goes
  // above every section, table or not.
  bar(slide, s.label, x, y, w);

  const total = cols.reduce((n, c) => n + c.width, 0);
  const colW = cols.map((c) => (c.width / total) * w);
  const all = asRows(v);

  // How many rows fit is a measurement, not a number in the format. Three risks
  // was a guess that held until a project had four, and dropping the fourth
  // silently is the one thing this must never do.
  const size = fitSize(
    (pt) =>
      all.reduce(
        (n, row) => n + linesForRow(cols.map((c) => row[c.id] ?? ''), colW, pt),
        1,
      ),
    h,
    NOMINAL.table,
    FLOOR,
  );
  const lineH = lineHeightIn(size);
  const headerH = lineH + 0.08;

  let used = headerH;
  const shown: Record<string, string>[] = [];
  for (const row of all) {
    const rowH = linesForRow(cols.map((c) => row[c.id] ?? ''), colW, size) * lineH + 0.08;
    if (used + rowH > h) break;
    shown.push(row);
    used += rowH;
  }
  const left = all.slice(shown.length);

  // On one page, the rows that did not fit are named rather than removed. The
  // count is the point: "+3 more" tells a reader the document is longer than
  // the slide, which is true and which they can act on.
  const note =
    left.length && overflow === 'fit'
      ? [
          cols.map((c, i) => ({
            text: i === 0 ? `+${left.length} more — see the Word or PDF version` : '',
            options: { italic: true, color: BRAND.muted },
          })),
        ]
      : [];

  const body = shown.length
    ? shown.map((row) => cols.map((c) => ({ text: row[c.id] || '—', options: {} })))
    : [cols.map((_, i) => ({ text: i === 0 ? 'None' : '—', options: {} }))];

  slide.addTable(
    [
      cols.map((c) => ({
        text: c.label,
        options: { fill: { color: BRAND.accentLine }, color: 'FFFFFF', bold: true },
      })),
      ...body,
      ...note,
    ],
    {
      x,
      y: y + BAR_H,
      w,
      colW,
      fontFace: BRAND.face,
      fontSize: size,
      color: BRAND.ink,
      border: { pt: 0.75, color: BRAND.rule },
      valign: 'middle',
      autoPage: false,
    },
  );

  return left.length ? { section: s, items: [], rows: left } : null;
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

/**
 * How much room a section's actual content wants, in inches.
 *
 * The format's declared height says what the design expects; this says what is
 * really there. Neither alone is right — the design stops one long section
 * eating the page, and the content stops a one-word section holding a box two
 * thirds empty, which is what a real status report looked like before this.
 */
function needFor(section: Section, value: unknown, w: number): number {
  switch (section.kind) {
    case 'paragraph': {
      const text = typeof value === 'string' ? value : '';
      return neededIn(linesFor(text || '—', w, NOMINAL.paragraph), NOMINAL.paragraph);
    }
    case 'list':
      return neededIn(linesForList(asStrings(value), w, NOMINAL.list), NOMINAL.list);
    case 'table': {
      const cols = section.columns ?? [];
      const total = cols.reduce((n, c) => n + c.width, 0) || 1;
      const colW = cols.map((c) => (c.width / total) * w);
      const lines = asRows(value).reduce(
        (n, row) => n + linesForRow(cols.map((c) => row[c.id] ?? ''), colW, NOMINAL.table),
        1,
      );
      return neededIn(lines, NOMINAL.table, 0.16);
    }
    case 'fields':
      return section.height;
  }
}

/**
 * A section may grow or shrink around what its format asked for, but not
 * without limit: past these bounds one section's content starts redesigning
 * the page for every other one.
 */
function weightFor(section: Section, value: unknown, w: number): number {
  const declared = section.height;
  return Math.min(declared * 2.2, Math.max(declared * 0.55, needFor(section, value, w)));
}

/**
 * A pack: one slide per section, walked through rather than handed over.
 *
 * The same sections, given room. A steering committee is presented to; a
 * one-pager is circulated. Neither is a better format, they are different
 * meetings, and the section list does not know which it is in.
 */
function renderPack(pptx: PptxGenJS, format: FormatDef, doc: FormatDoc): void {
  const cover = pptx.addSlide();
  cover.background = { color: BRAND.paper };
  cover.addText(doc.title, {
    x: M,
    y: 1.9,
    w: FULL,
    h: 1.2,
    fontFace: BRAND.faceHeading,
    fontSize: 32,
    color: BRAND.ink,
    valign: 'top',
  });
  cover.addText('', { x: M, y: 1.7, w: 1.2, h: 0, line: { color: BRAND.accentLine, width: 3 } });
  cover.addText(format.status ? `${format.name} · ${doc.status}` : format.name, {
    x: M,
    y: 3.2,
    w: FULL,
    h: 0.4,
    fontFace: BRAND.face,
    fontSize: 13,
    color: BRAND.muted,
  });

  for (const section of format.sections) {
    const slide = pptx.addSlide();
    slide.background = { color: BRAND.paper };
    const value = doc.sections[section.id];
    // A whole slide, so the caps that keep a one-pager readable do not apply.
    const roomy = { ...section, max: (section.max ?? 6) * 2, height: 3.1 };

    switch (section.kind) {
      case 'fields':
        drawFields(slide, section, value, doc, format, M, 1.0, FULL);
        break;
      case 'paragraph':
        drawParagraph(slide, roomy, value, M, 0.9, FULL, 3.1);
        break;
      case 'list':
        drawList(slide, roomy, value, M, 0.9, FULL, 3.1);
        break;
      case 'table':
        drawTable(slide, roomy, value, M, 0.9, FULL, 3.1, 'continue');
        break;
    }

    slide.addText(doc.title, {
      x: M,
      y: H - 0.34,
      w: 6,
      h: 0.22,
      fontFace: BRAND.face,
      fontSize: 8,
      color: BRAND.muted,
      valign: 'middle',
    });
  }
}

export async function renderFormat(
  format: FormatDef,
  doc: FormatDoc,
  opts: { overflow?: Overflow } = {},
): Promise<Buffer> {
  const overflow = opts.overflow ?? 'continue';
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.theme = { headFontFace: BRAND.faceHeading, bodyFontFace: BRAND.face };
  pptx.title = doc.title;

  if (format.layout === 'pack') {
    renderPack(pptx, format, doc);
    return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  }

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
  const each2 = (FULL - 0.14) / 2;

  // Allocate by what is actually there, then normalise to the page. Weighting
  // by the declared height alone gave "Key Decisions: None" a box two thirds
  // empty next to a section running past its own edge — the design deciding
  // something only the content knows.
  const available = H - (0.12 + BANNER_H + GAP) - FOOTER_H;
  const weights = laid.map((row) =>
    Math.max(
      ...row.map((section) =>
        weightFor(section, doc.sections[section.id], row.length === 2 ? each2 : FULL),
      ),
    ),
  );
  const chrome = laid.reduce((n, row) => n + (row[0].kind === 'fields' ? 0 : BAR_H) + GAP, 0);
  const scale = (available - chrome) / weights.reduce((n, x) => n + x, 0);

  const left: Left[] = [];
  let y = 0.12 + BANNER_H + GAP;
  laid.forEach((row, at) => {
    const rowH = weights[at] * scale;
    const isFields = row[0].kind === 'fields';
    const each = row.length === 2 ? each2 : FULL;

    row.forEach((section, i) => {
      const x = M + i * (each + 0.14);
      const value = doc.sections[section.id];
      switch (section.kind) {
        case 'paragraph':
          return drawParagraph(slide, section, value, x, y, each, rowH);
        case 'list': {
          const over = drawList(slide, section, value, x, y, each, rowH);
          if (over) left.push(over);
          return;
        }
        case 'table': {
          const over = drawTable(slide, section, value, x, y, each, rowH, overflow);
          if (over) left.push(over);
          return;
        }
        case 'fields':
          return drawFields(slide, section, value, doc, format, x, y, each);
      }
    });

    y += rowH + (isFields ? 0 : BAR_H) + GAP;
  });

  // Anything that did not fit gets its own slide rather than disappearing.
  // A one-pager that quietly became a summary of itself is how a risk nobody
  // was told about ends up in a document everybody signed.
  if (overflow === 'continue') {
    for (const over of left) {
      const extra = pptx.addSlide();
      extra.background = { color: BRAND.paper };
      extra.addText(`${doc.title} — ${over.section.label} (continued)`, {
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
      const roomy = { ...over.section, height: 3.6 };
      const rest = over.rows.length ? over.rows : over.items;
      if (over.rows.length) {
        drawTable(extra, roomy, rest, M, 0.12 + BANNER_H + GAP, FULL, 3.6, 'fit');
      } else {
        drawList(extra, roomy, rest, M, 0.12 + BANNER_H + GAP, FULL, 3.6);
      }
      extra.addText(doc.title, {
        x: M,
        y: H - 0.34,
        w: 6,
        h: 0.22,
        fontFace: BRAND.face,
        fontSize: 8,
        color: BRAND.muted,
        valign: 'middle',
      });
    }
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
