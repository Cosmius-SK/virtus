import { NextResponse } from 'next/server';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { client, MODELS } from '@/lib/ai/provider';
import { COMPOSE_SYSTEM } from '@/lib/ai/composePrompt';
import { formatById } from '@/lib/formats/registry';
import { OrgContextSchema } from '@/lib/org/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Turn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(20_000),
});

const Proposal = z.object({
  formatId: z.string().describe('The template id you would use. Empty while still asking.'),
  title: z.string().describe('What the document would be called. Empty while still asking.'),
  plan: z
    .array(z.string())
    .describe('One line per section: what would go in it, or that it would be thin.'),
});

const Reply = z.object({
  reply: z.string().describe('What you say to them. Under eighty words.'),
  ready: z.boolean().describe('True only when putting a proposal to them.'),
  proposal: Proposal,
});

export async function POST(req: Request) {
  let turns: z.infer<typeof Turn>[] = [];
  let org;
  try {
    const body = (await req.json()) as { messages?: unknown; org?: unknown };
    const parsed = z.array(Turn).min(1).max(40).safeParse(body.messages);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Send the conversation so far.' }, { status: 400 });
    }
    turns = parsed.data;
    const parsedOrg = OrgContextSchema.safeParse(body.org);
    if (parsedOrg.success && parsedOrg.data.entries.length) org = parsedOrg.data;
  } catch {
    return NextResponse.json({ error: 'Send JSON with messages.' }, { status: 400 });
  }

  try {
    const message = await client().messages.parse({
      model: MODELS.outline,
      max_tokens: 3000,
      system: [
        { type: 'text', text: COMPOSE_SYSTEM(org), cache_control: { type: 'ephemeral' } },
      ],
      messages: turns as Anthropic.Messages.MessageParam[],
      output_config: { format: zodOutputFormat(Reply), effort: 'low' },
    });

    if (message.stop_reason === 'refusal' || !message.parsed_output) {
      return NextResponse.json({ error: 'That could not be answered.' }, { status: 502 });
    }

    const out = message.parsed_output;
    // A proposal naming a template that does not exist is worse than no
    // proposal: the button would fail after they agreed to it.
    const known = out.proposal.formatId ? formatById(out.proposal.formatId) : undefined;

    return NextResponse.json({
      reply: out.reply,
      ready: out.ready && !!known,
      proposal: known
        ? { formatId: known.id, formatName: known.name, title: out.proposal.title, plan: out.proposal.plan }
        : null,
      usage: {
        model: message.model ?? MODELS.outline,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The model call failed.' },
      { status: 502 },
    );
  }
}
