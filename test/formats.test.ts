import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '@/lib/deck/format';
import { FORMATS } from '@/lib/formats/registry';
import { schemaFor } from '@/lib/formats/schema';
import { systemFor } from '@/lib/formats/prompt';
import type { FormatDef, FormatDoc, Section } from '@/lib/formats/types';

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

async function slideText(format: FormatDef, doc: FormatDoc): Promise<string[]> {
  const zip = await JSZip.loadAsync(await renderFormat(format, doc));
  const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
  return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
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
    const text = await slideText(format, empty(format));
    for (const s of format.sections) {
      if (s.kind === 'fields') continue; // its labels are the column headers
      expect(text, `${id} dropped ${s.id}`).toContain(s.label);
    }
  });

  it('renders a filled document and keeps the doubt off the slide', async () => {
    const doc = filled(format);
    const text = await slideText(format, doc);
    expect(text).toContain('A document');
    expect(text.join(' ')).not.toContain('A doubt');
  });
});
