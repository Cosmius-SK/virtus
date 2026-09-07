import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BRAND } from '@/lib/deck/master';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';

/**
 * The same format again, as a PDF.
 *
 * The third reader over one section list. A slide is for presenting, a Word
 * document is for editing, and a PDF is for sending to someone who should read
 * it and not change it — which is most of the people a status report reaches.
 *
 * One honest compromise: Helvetica rather than the house typeface. Embedding a
 * font means shipping the font file, and Trebuchet MS is licensed with Windows
 * rather than free to redistribute. The colours are the firm's; the letterforms
 * are not. If that matters, the answer is to buy a licence and embed it, not to
 * pretend.
 */
const A4 = { w: 595.28, h: 841.89 };
const M = 56;
const WIDTH = A4.w - M * 2;

const INK = hex(BRAND.ink);
const MUTED = hex(BRAND.muted);
const ACCENT = hex(BRAND.accent);
const RULE = hex(BRAND.rule);

function hex(h: string) {
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

interface Cursor {
  page: PDFPage;
  y: number;
}

/** Break text to a width, so nothing runs off the right edge. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out.length ? out : [''];
}

export async function renderPdf(format: FormatDef, doc: FormatDoc): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  pdf.setSubject(format.name);
  pdf.setCreator('Virtus');

  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const cursor: Cursor = { page: pdf.addPage([A4.w, A4.h]), y: A4.h - M };

  function room(needed: number) {
    if (cursor.y - needed >= M + 24) return;
    cursor.page = pdf.addPage([A4.w, A4.h]);
    cursor.y = A4.h - M;
  }

  function text(
    value: string,
    opts: { font?: PDFFont; size?: number; colour?: ReturnType<typeof rgb>; indent?: number } = {},
  ) {
    const font = opts.font ?? body;
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    for (const line of wrap(value, font, size, WIDTH - indent)) {
      room(size + 4);
      cursor.page.drawText(line, {
        x: M + indent,
        y: cursor.y - size,
        size,
        font,
        color: opts.colour ?? INK,
      });
      cursor.y -= size + 4;
    }
  }

  function heading(label: string) {
    room(28);
    cursor.y -= 12;
    cursor.page.drawRectangle({ x: M, y: cursor.y - 15, width: WIDTH, height: 18, color: ACCENT });
    cursor.page.drawText(label, {
      x: M + 6,
      y: cursor.y - 11,
      size: 10,
      font: bold,
      color: rgb(1, 1, 1),
    });
    cursor.y -= 24;
  }

  function table(section: Section, rows: Record<string, string>[]) {
    const cols = section.columns ?? [];
    const total = cols.reduce((n, c) => n + c.width, 0);
    const widths = cols.map((c) => (c.width / total) * WIDTH);

    room(24);
    let x = M;
    cursor.page.drawRectangle({ x: M, y: cursor.y - 13, width: WIDTH, height: 16, color: MUTED });
    cols.forEach((c, i) => {
      cursor.page.drawText(c.label, {
        x: x + 4,
        y: cursor.y - 10,
        size: 8,
        font: bold,
        color: rgb(1, 1, 1),
      });
      x += widths[i];
    });
    cursor.y -= 18;

    for (const row of rows) {
      // Tallest cell decides the row height, so nothing is clipped.
      const cells = cols.map((c, i) => wrap(row[c.id] || '—', body, 8, widths[i] - 8));
      const height = Math.max(...cells.map((lines) => lines.length)) * 11 + 4;
      room(height);
      x = M;
      cells.forEach((lines, i) => {
        lines.forEach((line, j) => {
          cursor.page.drawText(line, {
            x: x + 4,
            y: cursor.y - 9 - j * 11,
            size: 8,
            font: body,
            color: INK,
          });
        });
        x += widths[i];
      });
      cursor.y -= height;
      cursor.page.drawLine({
        start: { x: M, y: cursor.y + 2 },
        end: { x: M + WIDTH, y: cursor.y + 2 },
        thickness: 0.5,
        color: RULE,
      });
    }
    cursor.y -= 4;
  }

  // Title.
  text(doc.title, { font: bold, size: 20 });
  text(format.name, { colour: MUTED, size: 10 });
  cursor.y -= 6;

  for (const section of format.sections) {
    const value = doc.sections[section.id];

    if (section.kind === 'fields') {
      const values = (value ?? {}) as Record<string, string>;
      const entries = (section.fields ?? []).map((f) => [f.label, values[f.id] || '—'] as const);
      if (format.status) entries.push(['Status', doc.status]);
      for (const [label, v] of entries) {
        room(14);
        cursor.page.drawText(`${label}:`, { x: M, y: cursor.y - 9, size: 9, font: bold, color: MUTED });
        cursor.page.drawText(v, { x: M + 110, y: cursor.y - 9, size: 9, font: body, color: INK });
        cursor.y -= 14;
      }
      continue;
    }

    heading(section.label);

    if (section.kind === 'paragraph') {
      const v = typeof value === 'string' ? value.trim() : '';
      text(v || 'None.', v ? {} : { font: italic, colour: MUTED });
    } else if (section.kind === 'list') {
      const items = Array.isArray(value) ? (value as string[]) : [];
      if (!items.length) text('None.', { font: italic, colour: MUTED });
      for (const item of items) {
        room(14);
        cursor.page.drawText('•', { x: M, y: cursor.y - 9, size: 10, font: body, color: ACCENT });
        text(item, { indent: 14 });
      }
    } else {
      const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
      if (!rows.length) text('None.', { font: italic, colour: MUTED });
      else table(section, rows);
    }
  }

  // Footer on every page, added last so the count is known.
  const footer = process.env.VIRTUS_DECK_FOOTER ?? 'Internal';
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    page.drawText(footer, { x: M, y: 32, size: 7, font: body, color: MUTED });
    page.drawText(`${i + 1} of ${pages.length}`, {
      x: A4.w - M - 40,
      y: 32,
      size: 7,
      font: body,
      color: MUTED,
    });
  });

  return Buffer.from(await pdf.save());
}
