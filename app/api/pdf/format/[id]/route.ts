import { NextResponse } from 'next/server';
import { withHouse } from '@/lib/deck/master';
import { houseFrom } from '@/lib/house';
import { deckFilename } from '@/lib/deck/render';
import { resolveFormat } from '@/lib/formats/resolve';
import { schemaFor } from '@/lib/formats/schema';
import type { FormatDoc } from '@/lib/formats/types';
import { renderPdf } from '@/lib/pdf/format';

export const runtime = 'nodejs';

/** Approved fields → a PDF. No model call happens here. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // The body is read before the format is resolved, because a template built
  // in the admin space travels with the request rather than being looked up.
  let body: { doc?: unknown; format?: unknown; house?: unknown };
  try {
    body = (await req.json()) as { doc?: unknown; format?: unknown; house?: unknown };
  } catch {
    return NextResponse.json({ error: 'Send JSON with a doc.' }, { status: 400 });
  }

  const resolved = resolveFormat(id, body.format);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { format } = resolved;

  const parsed = schemaFor(format).safeParse(body.doc);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Send fields from the reading step.' }, { status: 400 });
  }
  const doc = parsed.data as FormatDoc;

  const buffer = await withHouse(houseFrom(body.house), () => renderPdf(format, doc));
  const name = deckFilename(`${doc.title} ${format.name}`).replace(/\.pptx$/, '.pdf');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
