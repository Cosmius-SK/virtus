import 'server-only';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { BRAND } from '@/lib/deck/master';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';

/**
 * The same format, as a Word document.
 *
 * A slide is the dense view — everything on one page, nothing said twice. A
 * document is the long one: room to write, room for a table that runs past four
 * rows, and something a person can send in an email and comment on.
 *
 * The section list describes both. That is the whole point of describing a
 * format as data: a second output is a second reader over the same structure,
 * not a second product.
 *
 * Same rule as the slide: every section appears whether or not it has content,
 * and nothing that was not in the note is added to fill it.
 */
const FONT = 'Trebuchet MS';

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: BRAND.accent })],
  });
}

function body(text: string, italic = false): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text, font: FONT, size: 20, italics: italic, color: italic ? BRAND.muted : BRAND.ink }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 20, color: BRAND.ink })],
  });
}

function cell(text: string, opts: { header?: boolean } = {}): TableCell {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: opts.header ? { fill: BRAND.accent } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT,
            size: 18,
            bold: opts.header,
            color: opts.header ? 'FFFFFF' : BRAND.ink,
          }),
        ],
      }),
    ],
  });
}

const NO_BORDER = { style: BorderStyle.SINGLE, size: 2, color: BRAND.rule };

function table(rows: TableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows,
  });
}

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asRows(v: unknown): Record<string, string>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, string> => !!x && typeof x === 'object')
    : [];
}

function section(s: Section, value: unknown, doc: FormatDoc, format: FormatDef): (Paragraph | Table)[] {
  switch (s.kind) {
    case 'fields': {
      const values = (value ?? {}) as Record<string, string>;
      const entries = [...(s.fields ?? []).map((f) => [f.label, values[f.id] || '—'] as const)];
      if (format.status) entries.push(['Status', doc.status]);
      return [
        table(
          entries.map(([label, v]) => new TableRow({ children: [cell(label, { header: true }), cell(v)] })),
        ),
        body(''),
      ];
    }
    case 'paragraph':
      return [heading(s.label), body(typeof value === 'string' && value.trim() ? value : '—', !value)];
    case 'list': {
      const items = asStrings(value);
      // A document is not a slide: it has room for all of them.
      return [heading(s.label), ...(items.length ? items.map(bullet) : [body('None.', true)])];
    }
    case 'table': {
      const cols = s.columns ?? [];
      const rows = asRows(value);
      if (!rows.length) return [heading(s.label), body('None.', true)];
      return [
        heading(s.label),
        table([
          new TableRow({ children: cols.map((c) => cell(c.label, { header: true })) }),
          ...rows.map(
            (row) => new TableRow({ children: cols.map((c) => cell(row[c.id] || '—')) }),
          ),
        ]),
        body(''),
      ];
    }
  }
}

export async function renderDocx(format: FormatDef, doc: FormatDoc): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 60 },
      children: [new TextRun({ text: doc.title, font: FONT, size: 36, bold: true, color: BRAND.ink })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: format.name, font: FONT, size: 20, color: BRAND.muted })],
    }),
  ];

  for (const s of format.sections) {
    children.push(...section(s, doc.sections[s.id], doc, format));
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: process.env.VIRTUS_DECK_FOOTER ?? 'Internal',
          font: FONT,
          size: 16,
          color: BRAND.muted,
        }),
      ],
    }),
  );

  const document = new Document({
    title: doc.title,
    description: format.name,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(document);
}
