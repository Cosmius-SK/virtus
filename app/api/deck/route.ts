import { NextResponse } from 'next/server';
import { deckFilename, renderDeck } from '@/lib/deck/render';
import { OutlineSchema } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Outline → .pptx. Renders only what they approved (§6.3).
 *
 * No model call happens here. The argument was settled upstream; this turns an
 * approved list into a file, which is why regenerating one slide is possible
 * and cheap.
 */
export async function POST(req: Request) {
  let outline;
  try {
    const body = (await req.json()) as { outline?: unknown };
    const parsed = OutlineSchema.safeParse(body.outline);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Send an approved outline.' }, { status: 400 });
    }
    outline = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Send JSON with an outline.' }, { status: 400 });
  }
  if (outline.slides.length === 0) {
    return NextResponse.json({ error: 'The outline has no slides.' }, { status: 400 });
  }

  const buffer = await renderDeck(outline);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${deckFilename(outline.title)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
