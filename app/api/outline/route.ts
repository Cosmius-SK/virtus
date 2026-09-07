import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELS, structured } from '@/lib/ai/provider';
import { OUTLINE_SYSTEM, outlineUser } from '@/lib/ai/outlinePrompt';
import { OutlineSchema, StructureSchema, type Outline } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Structure → outline. The argument, before any slide exists (§6).
 *
 * Deliberately separate from /api/deck. A whole deck is never regenerated to
 * fix one slide; an outline is edited, and editing an outline is choosing.
 */
export async function POST(req: Request) {
  let body: { structure?: unknown; ask?: unknown };
  try {
    body = (await req.json()) as { structure?: unknown; ask?: unknown };
  } catch {
    return NextResponse.json({ error: 'Send JSON with a structure.' }, { status: 400 });
  }
  const parsed = StructureSchema.safeParse(body.structure);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Send a structure from /api/structure.' }, { status: 400 });
  }
  const ask = typeof body.ask === 'string' ? body.ask : '';

  try {
    const { value, model, inputTokens, outputTokens } = await structured<Outline>({
      model: MODELS.outline,
      system: OUTLINE_SYSTEM,
      user: outlineUser(parsed.data, ask),
      format: zodOutputFormat(OutlineSchema),
      effort: 'medium',
      maxTokens: 8000,
    });
    return NextResponse.json({ outline: value, usage: { model, inputTokens, outputTokens } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The model call failed.' },
      { status: 502 },
    );
  }
}
