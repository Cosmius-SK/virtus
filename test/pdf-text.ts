import { inflateSync } from 'node:zlib';

/**
 * The text a PDF actually shows.
 *
 * Written because the first assertion about a PDF was worthless: pdf-lib
 * compresses its content streams, so "the rendered file does not contain this
 * string" passed whatever the renderer did. A negative assertion against
 * compressed bytes proves nothing at all.
 *
 * The second version was worthless too, more quietly: it matched only
 * parenthesised strings, and pdf-lib writes hex ones. It returned an empty
 * string for every file, so the negative assertion passed and the positive one
 * was what caught it — which is the argument for always pairing them.
 */

/** The handful of WinAnsi codepoints that are not Latin-1. */
const WINANSI: Record<number, string> = {
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
};

function decode(bytes: Buffer): string {
  let out = '';
  for (const byte of bytes) out += WINANSI[byte] ?? String.fromCharCode(byte);
  return out;
}

export function pdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const out: string[] = [];

  const stream = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = stream.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;

    let content: string;
    try {
      content = inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1');
    } catch {
      continue; // fonts and images live in streams too
    }

    // pdf-lib writes hex strings; literal ones are handled for completeness.
    for (const show of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      out.push(decode(Buffer.from(show[1].replace(/\s+/g, ''), 'hex')));
    }
    for (const show of content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      out.push(show[1].replace(/\\([()\\])/g, '$1'));
    }
  }
  return out.join('\n');
}
