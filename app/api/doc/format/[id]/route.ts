import { NextResponse } from 'next/server';
import { renderDocx } from '@/lib/docs/format';
import { deckFilename } from '@/lib/deck/render';
import { formatById } from '@/lib/formats/registry';
import { schemaFor } from '@/lib/formats/schema';
import type { FormatDoc } from '@/lib/formats/types';

export const runtime = 'nodejs';

/** Approved fields → a Word document. No model call happens here. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const format = formatById(id);
  if (!format) return NextResponse.json({ error: 'No such format.' }, { status: 404 });
  if (!format.outputs.includes('docx')) {
    return NextResponse.json({ error: 'That format is not a document.' }, { status: 400 });
  }

  let doc: FormatDoc;
  try {
    const body = (await req.json()) as { doc?: unknown };
    const parsed = schemaFor(format).safeParse(body.doc);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Send fields from the reading step.' }, { status: 400 });
    }
    doc = parsed.data as FormatDoc;
  } catch {
    return NextResponse.json({ error: 'Send JSON with a doc.' }, { status: 400 });
  }

  const buffer = await renderDocx(format, doc);
  const name = deckFilename(`${doc.title} ${format.name}`).replace(/\.pptx$/, '.docx');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
