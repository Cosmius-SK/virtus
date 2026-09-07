import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELS, structured } from '@/lib/ai/provider';
import { systemFor, userFor } from '@/lib/formats/prompt';
import { formatById } from '@/lib/formats/registry';
import { schemaFor } from '@/lib/formats/schema';
import type { FormatDoc } from '@/lib/formats/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** A note → the fields of any format. One endpoint for all of them (§7). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const format = formatById(id);
  if (!format) return NextResponse.json({ error: 'No such format.' }, { status: 404 });

  let note = '';
  try {
    const body = (await req.json()) as { note?: unknown };
    note = typeof body.note === 'string' ? body.note.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Send JSON with a note.' }, { status: 400 });
  }
  if (!note) return NextResponse.json({ error: 'The note is empty.' }, { status: 400 });
  if (note.length > 60_000) {
    return NextResponse.json(
      { error: 'That note is longer than one pass can hold. Split it in two.' },
      { status: 413 },
    );
  }

  const started = Date.now();
  try {
    const { value, model, inputTokens, outputTokens } = await structured<FormatDoc>({
      model: MODELS.structure,
      system: systemFor(format),
      user: userFor(note),
      format: zodOutputFormat(schemaFor(format)),
      effort: 'low',
      maxTokens: 8000,
    });
    return NextResponse.json({
      doc: value,
      usage: { model, inputTokens, outputTokens, ms: Date.now() - started },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The model call failed.' },
      { status: 502 },
    );
  }
}
