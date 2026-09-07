import { NextResponse } from 'next/server';
import { withHouse } from '@/lib/deck/master';
import { houseFrom } from '@/lib/house';
import { renderDocx } from '@/lib/docs/format';
import { deckFilename } from '@/lib/deck/render';
import { resolveFormat } from '@/lib/formats/resolve';
import { schemaFor } from '@/lib/formats/schema';
import type { FormatDoc } from '@/lib/formats/types';

export const runtime = 'nodejs';

/** Approved fields → a Word document. No model call happens here. */
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
  if (!format.outputs.includes('docx')) {
    return NextResponse.json({ error: 'That template is not a document.' }, { status: 400 });
  }

  const parsed = schemaFor(format).safeParse(body.doc);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Send fields from the reading step.' }, { status: 400 });
  }
  const doc = parsed.data as FormatDoc;

  const buffer = await withHouse(houseFrom(body.house), () => renderDocx(format, doc));
  const name = deckFilename(`${doc.title} ${format.name}`).replace(/\.pptx$/, '.docx');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
