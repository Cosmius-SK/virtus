import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '@/lib/deck/format';
import { renderDocx } from '@/lib/docs/format';
import { renderPdf } from '@/lib/pdf/format';
import { FORMATS } from '@/lib/formats/registry';
import { schemaFor } from '@/lib/formats/schema';
import { systemFor } from '@/lib/formats/prompt';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';
import { pdfText } from './pdf-text';

/**
 * Fourteen formats are only worth having if all fourteen work. These run every
 * one of them through the whole engine — schema, prompt, renderer — so a
 * malformed entry in the registry fails here rather than in front of a leader.
 */

/** A document with every section empty: the hardest case for a renderer. */
function empty(format: FormatDef): FormatDoc {
  const sections: FormatDoc['sections'] = {};
  for (const s of format.sections) {
    sections[s.id] =
      s.kind === 'paragraph'
        ? ''
        : s.kind === 'list'
          ? []
          : s.kind === 'table'
            ? []
            : Object.fromEntries((s.fields ?? []).map((f) => [f.id, '']));
  }
  return { title: 'A document', status: 'In Progress', reconcile: [], sections };
}

/** A document with something in every section, from the section's own labels. */
function filled(format: FormatDef): FormatDoc {
  const sections: FormatDoc['sections'] = {};
  for (const s of format.sections) {
    sections[s.id] =
      s.kind === 'paragraph'
        ? `Prose for ${s.id}.`
        : s.kind === 'list'
          ? [`First ${s.id}`, `Second ${s.id}`]
          : s.kind === 'table'
            ? [Object.fromEntries((s.columns ?? []).map((c) => [c.id, `${c.id} value`]))]
            : Object.fromEntries((s.fields ?? []).map((f) => [f.id, `${f.id} value`]));
  }
  return { title: 'A document', status: 'At Risk', reconcile: ['A doubt'], sections };
}

/** Every slide's text, so a pack is read as a whole rather than by its cover. */
async function slideText(format: FormatDef, doc: FormatDoc): Promise<string[]> {
  const zip = await JSZip.loadAsync(await renderFormat(format, doc));
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const name of names) {
    const xml = await zip.file(name)!.async('string');
    out.push(...[...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]));
  }
  return out;
}

/** How many slides a format produced. */
async function slideCount(format: FormatDef, doc: FormatDoc): Promise<number> {
  const zip = await JSZip.loadAsync(await renderFormat(format, doc));
  return Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
}

describe('the registry itself', () => {
  it('has no duplicate format or section ids', () => {
    expect(new Set(FORMATS.map((f) => f.id)).size).toBe(FORMATS.length);
    for (const format of FORMATS) {
      const ids = format.sections.map((s) => s.id);
      expect(new Set(ids).size, `${format.id} has a duplicate section id`).toBe(ids.length);
    }
  });

  it('gives every table a column and every fields row a field', () => {
    for (const format of FORMATS) {
      for (const s of format.sections) {
        if (s.kind === 'table') expect(s.columns?.length, `${format.id}/${s.id}`).toBeGreaterThan(0);
        if (s.kind === 'fields') expect(s.fields?.length, `${format.id}/${s.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('never leaves a beside section without a partner', () => {
    for (const format of FORMATS) {
      format.sections.forEach((s: Section, i) => {
        if (s.beside) expect(format.sections[i + 1], `${format.id}/${s.id}`).toBeDefined();
      });
    }
  });
});

describe.each(FORMATS.map((f) => [f.id, f] as const))('%s', (id, format) => {
  it('builds a schema the model can be asked to fill', () => {
    const schema = schemaFor(format);
    expect(schema.safeParse(filled(format)).success).toBe(true);
    expect(schema.safeParse(empty(format)).success).toBe(true);
  });

  it('builds a prompt that names every section and carries the invariants', () => {
    const system = systemFor(format);
    for (const s of format.sections) expect(system).toContain(s.id);
    expect(system).toContain('Invent nothing');
    expect(system).toContain('reconcile');
  });

  it('renders an empty document without dropping a section', async () => {
    if (!format.outputs.includes('pptx')) return;
    const text = await slideText(format, empty(format));
    for (const s of format.sections) {
      if (s.kind === 'fields') continue; // its labels are the column headers
      expect(text, `${id} dropped ${s.id}`).toContain(s.label);
    }
  });

  it('declares at least one output and can produce every one it declares', async () => {
    expect(format.outputs.length).toBeGreaterThan(0);
    for (const out of format.outputs) {
      const buffer =
        out === 'pptx'
          ? await renderFormat(format, filled(format))
          : out === 'docx'
            ? await renderDocx(format, filled(format))
            : await renderPdf(format, filled(format));
      // A truncated file is the failure that matters: it opens as a
      // corrupt-file dialog in front of whoever was shown it. Office formats
      // are zip containers; a PDF starts %PDF.
      expect(buffer.length, `${id} ${out}`).toBeGreaterThan(1_000);
      expect(buffer.subarray(0, 4).toString('latin1'), `${id} ${out}`).toBe(
        out === 'pdf' ? '%PDF' : 'PK\u0003\u0004',
      );
    }
  });

  it('renders as PDF without dropping a section, and keeps the doubt out', async () => {
    if (!format.outputs.includes('pdf')) return;
    // Read through the compression. A negative assertion against compressed
    // bytes proves nothing, which the first version of this test did not.
    const text = pdfText(await renderPdf(format, filled(format)));
    expect(text, `${id} produced an unreadable PDF`).toContain('A document');
    for (const s of format.sections) {
      if (s.kind === 'fields') continue;
      expect(text, `${id} dropped ${s.id} from the PDF`).toContain(s.label);
    }
    expect(text).not.toContain('A doubt');
  });

  it('renders as Word without dropping a section, where it offers Word', async () => {
    if (!format.outputs.includes('docx')) return;
    const zip = await JSZip.loadAsync(await renderDocx(format, filled(format)));
    const xml = await zip.file('word/document.xml')!.async('string');
    for (const s of format.sections) {
      if (s.kind === 'fields') continue;
      expect(xml, `${id} dropped ${s.id} from the Word version`).toContain(s.label);
    }
    expect(xml).not.toContain('A doubt');
  });

  it('gives a pack a slide per section, and a one-pager exactly one', async () => {
    if (!format.outputs.includes('pptx')) return;
    const count = await slideCount(format, filled(format));
    if (format.layout === 'pack') {
      // A cover, then one per section. A pack that collapses to one slide has
      // silently become a one-pager, which is a different meeting.
      expect(count, format.id).toBe(format.sections.length + 1);
    } else {
      expect(count, format.id).toBe(1);
    }
  });

  it('renders a filled document and keeps the doubt off the slide', async () => {
    if (!format.outputs.includes('pptx')) return;
    const doc = filled(format);
    const text = await slideText(format, doc);
    expect(text).toContain('A document');
    expect(text.join(' ')).not.toContain('A doubt');
  });
});
