import { NextResponse } from 'next/server';
import { deckFilename } from '@/lib/deck/render';
import { renderWsr } from '@/lib/deck/wsr';
import { WsrSchema } from '@/lib/types';

export const runtime = 'nodejs';

/** Approved fields → the one-pager. No model call happens here. */
export async function POST(req: Request) {
  let parsed;
  try {
    const body = (await req.json()) as { wsr?: unknown };
    parsed = WsrSchema.safeParse(body.wsr);
  } catch {
    return NextResponse.json({ error: 'Send JSON with a wsr.' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Send fields from /api/wsr.' }, { status: 400 });
  }

  const buffer = await renderWsr(parsed.data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${deckFilename(parsed.data.title + ' status')}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
