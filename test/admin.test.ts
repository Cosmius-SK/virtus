import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '@/lib/deck/format';
import { withHouse } from '@/lib/deck/master';
import { STATUS } from '@/lib/deck/status';
import { FormatDefSchema } from '@/lib/formats/def-schema';
import { FORMATS, formatById } from '@/lib/formats/registry';
import { resolveFormat } from '@/lib/formats/resolve';
import type { FormatDef, FormatDoc } from '@/lib/formats/types';
import { houseFromTheme, paletteFrom } from '@/lib/house';

/**
 * The admin space lets somebody define a template and a palette that the engine
 * then trusts. Both are the silent kind of failure this repository keeps being
 * bitten by: a malformed template still produces a file, and a house style that
 * fails to apply still produces a file. It opens, it looks finished, and it is
 * wrong — and by then it has been sent.
 *
 * Every negative assertion below is paired with a positive one, because "the
 * output does not contain X" cannot tell absence from blindness (three tests in
 * this repository have already failed that way).
 */
function def(part: Partial<FormatDef> = {}): FormatDef {
  return {
    id: 'sample',
    name: 'Sample',
    description: 'A sample.',
    audience: 'somebody',
    category: 'Operations',
    status: false,
    outputs: ['pptx'],
    layout: 'one-pager',
    sections: [{ id: 'summary', label: 'Summary', kind: 'paragraph', hint: 'A line.', height: 1 }],
    ...part,
  };
}

describe('a template built rather than shipped', () => {
  it('accepts a well-formed one', () => {
    expect(FormatDefSchema.safeParse(def()).success).toBe(true);
  });

  it('refuses a table with no columns, which would render an empty box', () => {
    const bad = def({
      sections: [{ id: 'risks', label: 'Risks', kind: 'table', hint: '', height: 1 }],
    });
    expect(FormatDefSchema.safeParse(bad).success).toBe(false);
    // Paired: the same section WITH columns is accepted, so the refusal is
    // about the missing columns and not about tables in general.
    const good = def({
      sections: [
        {
          id: 'risks',
          label: 'Risks',
          kind: 'table',
          hint: '',
          height: 1,
          columns: [{ id: 'risk', label: 'Risk', hint: '', width: 1 }],
        },
      ],
    });
    expect(FormatDefSchema.safeParse(good).success).toBe(true);
  });

  it('refuses two sections with the same id, one of which would be lost', () => {
    const bad = def({
      sections: [
        { id: 'a', label: 'One', kind: 'list', hint: '', height: 1 },
        { id: 'a', label: 'Two', kind: 'list', hint: '', height: 1 },
      ],
    });
    expect(FormatDefSchema.safeParse(bad).success).toBe(false);
    const good = def({
      sections: [
        { id: 'a', label: 'One', kind: 'list', hint: '', height: 1 },
        { id: 'b', label: 'Two', kind: 'list', hint: '', height: 1 },
      ],
    });
    expect(FormatDefSchema.safeParse(good).success).toBe(true);
  });

  it('refuses an id the engine cannot use as a key', () => {
    expect(FormatDefSchema.safeParse(def({ id: 'Has Spaces' })).success).toBe(false);
    expect(FormatDefSchema.safeParse(def({ id: 'has-none' })).success).toBe(true);
  });
});

describe('resolving which template a request is about', () => {
  it('takes the shipped one, whatever the request carries', () => {
    const shipped = FORMATS[0];
    const impostor = def({ id: shipped.id, name: 'Not this' });
    const out = resolveFormat(shipped.id, impostor);
    expect('format' in out && out.format.name).toBe(shipped.name);
    // Paired: an id that is NOT shipped does take the carried definition, so
    // the line above is the registry winning rather than carrying being broken.
    const custom = resolveFormat('built-here', def({ id: 'built-here', name: 'Built here' }));
    expect('format' in custom && custom.format.name).toBe('Built here');
  });

  it('refuses a carried template that does not match the id asked for', () => {
    const out = resolveFormat('one-thing', def({ id: 'another-thing' }));
    expect('error' in out).toBe(true);
    expect('format' in resolveFormat('another-thing', def({ id: 'another-thing' }))).toBe(true);
  });

  it('refuses a malformed template rather than building a prompt from it', () => {
    const out = resolveFormat('broken', { id: 'broken', name: 'Broken' });
    expect('error' in out).toBe(true);
    expect('format' in resolveFormat('broken', def({ id: 'broken' }))).toBe(true);
  });

  it('is a 404 when there is nothing shipped and nothing carried', () => {
    const out = resolveFormat('nothing-like-this', undefined);
    expect('error' in out && out.status).toBe(404);
  });
});

const THEME = `<?xml version="1.0"?>
<a:theme xmlns:a="x">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="112233"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="445566"/></a:dk2>
      <a:lt2><a:srgbClr val="EEEEEE"/></a:lt2>
      <a:accent1><a:srgbClr val="AB12CD"/></a:accent1>
      <a:accent2><a:srgbClr val="112299"/></a:accent2>
      <a:accent3><a:srgbClr val="998811"/></a:accent3>
      <a:accent4><a:srgbClr val="AA3344"/></a:accent4>
      <a:accent5><a:srgbClr val="336655"/></a:accent5>
      <a:accent6><a:srgbClr val="777777"/></a:accent6>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Georgia"/></a:majorFont>
      <a:minorFont><a:latin typeface="Verdana"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;

describe('reading a house style out of a template file', () => {
  it('takes the accents and the two typefaces', () => {
    const house = houseFromTheme(THEME, 'firm.potx');
    expect(house.accent).toBe('AB12CD');
    expect(house.series.slice(0, 2)).toEqual(['AB12CD', '112299']);
    expect(house.faceHeading).toBe('Georgia');
    expect(house.face).toBe('Verdana');
    expect(house.ink).toBe('112233');
  });

  it('falls back rather than producing a document nobody can read', () => {
    // A theme naming a pale colour as its dark one is not rare, and body text
    // in it is invisible on white — the file still opens, which is the problem.
    const pale = THEME.replace('lastClr="112233"', 'lastClr="F4F4F4"').replace(
      '<a:srgbClr val="445566"/>',
      '<a:srgbClr val="F0F0F0"/>',
    );
    expect(houseFromTheme(pale, 'x').ink).toBe('1A1A1A');
    // Paired: a legible dark colour IS taken, so the line above is the guard
    // and not the parser failing to read dk1 at all.
    expect(houseFromTheme(THEME, 'x').ink).toBe('112233');
  });

  it('survives a theme with no fonts named', () => {
    const bare = THEME.replace(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/, '');
    expect(houseFromTheme(bare, 'x').face).toBe('Calibri');
    expect(houseFromTheme(THEME, 'x').face).toBe('Verdana');
  });
});

const doc: FormatDoc = {
  title: 'A document',
  status: 'At Risk',
  reconcile: [],
  sections: { summary: 'One line of prose.' },
};

async function slideXml(format: FormatDef, house?: ReturnType<typeof paletteFrom>) {
  const buffer = await withHouse(house, () => renderFormat(format, doc));
  const zip = await JSZip.loadAsync(buffer);
  const parts = Object.keys(zip.files).filter((n) => n.startsWith('ppt/slides/slide'));
  return (await Promise.all(parts.map((n) => zip.file(n)!.async('string')))).join('');
}

describe('a house style reaching the file', () => {
  it('replaces the built-in accent, and only while it is in force', async () => {
    // A format with no status legend, deliberately: the legend draws every
    // status colour, one of which is the built-in accent green, so a format
    // carrying it could not tell "the accent was replaced" from "green appears
    // somewhere". The status colours are the subject of the next test.
    const format = def();
    const house = paletteFrom(houseFromTheme(THEME, 'firm.potx'));

    const themed = await slideXml(format, house);
    expect(themed).toContain('AB12CD');
    expect(themed).toContain('Georgia');
    expect(themed).not.toContain('0F7F40');

    // The pair that makes the lines above mean something: the same render with
    // no house style is the exact opposite. Without this, a renderer that had
    // stopped emitting colours at all would pass every assertion above.
    const plain = await slideXml(format);
    expect(plain).toContain('0F7F40');
    expect(plain).toContain('Trebuchet MS');
    expect(plain).not.toContain('AB12CD');
  });

  it('leaves the status colours alone', async () => {
    const format = formatById('weekly-status')!;
    const house = paletteFrom(houseFromTheme(THEME, 'firm.potx'));
    const themed = await slideXml(format, house);
    // Amber has to stay amber. A firm's brand must not make "At Risk" calm.
    expect(themed).toContain(STATUS['At Risk']);
    expect(STATUS['At Risk']).not.toBe('AB12CD');
    // Paired: the house style did reach this render too, so the line above is
    // the status colours being exempt rather than the house style not applying.
    expect(themed).toContain('AB12CD');
  });
});
