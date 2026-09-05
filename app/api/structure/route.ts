import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELS, structured } from '@/lib/ai/provider';
import { STRUCTURE_SYSTEM, structureUser } from '@/lib/ai/structurePrompt';
import { StructureSchema, type Structure } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Note → structure. An endpoint first and a screen second (§7): the web app is
 * the first caller, not the owner, and the MCP server will call this one.
 */
export async function POST(req: Request) {
  let note: string;
  try {
    const body = (await req.json()) as { note?: unknown };
    note = typeof body.note === 'string' ? body.note.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Send JSON with a note.' }, { status: 400 });
  }
  if (!note) return NextResponse.json({ error: 'The note is empty.' }, { status: 400 });
  if (note.length > 40_000) {
    return NextResponse.json(
      { error: 'That note is longer than one pass can hold. Split it in two.' },
      { status: 413 },
    );
  }

  try {
    const { value, inputTokens, outputTokens } = await structured<Structure>({
      model: MODELS.structure,
      system: STRUCTURE_SYSTEM,
      user: structureUser(note),
      format: zodOutputFormat(StructureSchema),
      effort: 'low',
      maxTokens: 4000,
    });
    return NextResponse.json({ structure: value, usage: { inputTokens, outputTokens } });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 502 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'The model call failed.';
}
