import { NextResponse } from 'next/server';
import { deckFilename } from '@/lib/deck/render';
import { renderFormat } from '@/lib/deck/format';
import { formatById } from '@/lib/formats/registry';
import { schemaFor } from '@/lib/formats/schema';
import type { FormatDoc } from '@/lib/formats/types';

export const runtime = 'nodejs';

/** Approved fields → the slide. No model call happens here. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const format = formatById(id);
  if (!format) return NextResponse.json({ error: 'No such format.' }, { status: 404 });

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

  const buffer = await renderFormat(format, doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${deckFilename(`${doc.title} ${format.name}`)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
