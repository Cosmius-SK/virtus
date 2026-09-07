import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELS, structured } from '@/lib/ai/provider';
import { rewriteSystem, rewriteUser } from '@/lib/formats/prompt';
import { resolveFormat } from '@/lib/formats/resolve';
import { schemaForSection } from '@/lib/formats/schema';
import type { SectionValue } from '@/lib/formats/types';
import { OrgContextSchema } from '@/lib/org/schema';
import type { OrgContext } from '@/lib/org/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * One section, rewritten. Everything else stays exactly as approved (§6).
 *
 * This is the loop that was missing, and the reason it is a section rather than
 * the document: rule 2 says never regenerate a whole artefact to fix one part
 * of it. Rewriting everything to sharpen one paragraph throws away edits the
 * person already made and charges them for the privilege.
 *
 * Because the note is the only source, a rewrite cannot introduce a fact the
 * first pass did not have. Pressing it repeatedly gets different sentences, not
 * a longer document.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send JSON with a section to rewrite.' }, { status: 400 });
  }

  const resolved = resolveFormat(id, body.format);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { format } = resolved;

  const sectionId = typeof body.sectionId === 'string' ? body.sectionId : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const current = typeof body.current === 'string' ? body.current : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction.slice(0, 2000) : '';
  const parsedOrg = OrgContextSchema.safeParse(body.org);
  const org: OrgContext | undefined =
    parsedOrg.success && parsedOrg.data.entries.length ? parsedOrg.data : undefined;

  const section = format.sections.find((s) => s.id === sectionId);
  if (!section) return NextResponse.json({ error: 'No such section.' }, { status: 404 });
  if (!note) {
    return NextResponse.json(
      { error: 'The original input is no longer available to rewrite from.' },
      { status: 400 },
    );
  }
  if (note.length > 60_000) {
    return NextResponse.json({ error: 'That input is too long for one pass.' }, { status: 413 });
  }

  const started = Date.now();
  try {
    const { value, model, inputTokens, outputTokens } = await structured<{ value: SectionValue }>({
      model: MODELS.structure,
      system: rewriteSystem(format, section, org),
      user: rewriteUser(note, current, instruction),
      format: zodOutputFormat(schemaForSection(section)),
      effort: 'low',
      maxTokens: 2000,
    });
    return NextResponse.json({
      value: value.value,
      usage: { model, inputTokens, outputTokens, ms: Date.now() - started },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The model call failed.' },
      { status: 502 },
    );
  }
}
