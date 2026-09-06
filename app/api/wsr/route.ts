import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELS, structured } from '@/lib/ai/provider';
import { WSR_SYSTEM, wsrUser } from '@/lib/ai/wsrPrompt';
import { WsrSchema, type Wsr } from '@/lib/types';

export const runtime = 'nodejs';

/** A week's notes → the fields of a status one-pager. Endpoint first (§7). */
export async function POST(req: Request) {
  let note: string;
  try {
    const body = (await req.json()) as { note?: unknown };
    note = typeof body.note === 'string' ? body.note.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Send JSON with a note.' }, { status: 400 });
  }
  if (!note) return NextResponse.json({ error: 'The note is empty.' }, { status: 400 });

  try {
    const { value, inputTokens, outputTokens } = await structured<Wsr>({
      model: MODELS.structure,
      system: WSR_SYSTEM,
      user: wsrUser(note),
      format: zodOutputFormat(WsrSchema),
      effort: 'low',
      maxTokens: 6000,
    });
    return NextResponse.json({ wsr: value, usage: { inputTokens, outputTokens } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The model call failed.' },
      { status: 502 },
    );
  }
}
