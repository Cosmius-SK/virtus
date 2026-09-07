import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * The one place that decides which provider, which endpoint, which key (§5).
 *
 * Virtus sends what people write to a model, and inside a company that includes
 * client names, unannounced plans and things under NDA. Somebody will ask,
 * correctly, where that lands — and the answer must be a config change, not a
 * search-and-replace. So every model call in the product comes through here.
 *
 * Set VIRTUS_AI_PROVIDER once the firm's answer is known:
 *   anthropic  the first-party API (default)
 *   bedrock    AWS Bedrock, under the firm's existing AWS agreement
 *   vertex     Google Vertex AI
 *   foundry    Microsoft Foundry
 */
export type Provider = 'anthropic' | 'bedrock' | 'vertex' | 'foundry';

export const PROVIDER = (process.env.VIRTUS_AI_PROVIDER ?? 'anthropic') as Provider;

/**
 * The classification line (§5). Almost every firm has one — some material may
 * go to an approved external service and some may not. Virtus should know that
 * line and say so plainly rather than discover it during a security review.
 */
export const CLASSIFICATION =
  process.env.VIRTUS_CLASSIFICATION ?? 'Not yet set — ask before using real client material.';

/**
 * Opus 5 for both passes. The brief reaches for a cheap model on the structure
 * pass; that is a per-firm cost decision rather than a default, so it is an env
 * var and not a hardcoded downgrade.
 */
export const MODELS = {
  structure: process.env.VIRTUS_MODEL_STRUCTURE ?? 'claude-opus-5',
  outline: process.env.VIRTUS_MODEL_OUTLINE ?? 'claude-opus-5',
} as const;

let _client: Anthropic | null = null;

export function client(): Anthropic {
  if (_client) return _client;

  switch (PROVIDER) {
    case 'anthropic':
      // An unset ANTHROPIC_API_KEY does not mean there are no credentials — the
      // SDK also resolves an auth token and an `ant auth login` profile. Let it
      // try, and only translate the failure.
      try {
        _client = new Anthropic();
      } catch {
        throw new Error(
          'No Anthropic credentials — set ANTHROPIC_API_KEY in .env.local, or run `ant auth login`.',
        );
      }
      return _client;
    default:
      // Deliberately a clear instruction rather than a silent fallback to the
      // first-party API: falling back is how internal documents end up going
      // somewhere nobody approved.
      throw new Error(
        `VIRTUS_AI_PROVIDER=${PROVIDER} needs its platform SDK installed and wired up here ` +
          `(@anthropic-ai/bedrock-sdk, @anthropic-ai/vertex-sdk or @anthropic-ai/foundry-sdk). ` +
          `This is the one module to change — nothing else in Virtus knows which provider it is.`,
      );
  }
}

/** What Virtus says, plainly, when asked where the text goes. */
export function destination(): { provider: Provider; models: string[]; classification: string } {
  return {
    provider: PROVIDER,
    models: [...new Set(Object.values(MODELS))],
    classification: CLASSIFICATION,
  };
}

/**
 * Every model call in the product. One shape, so cost, caching and refusal
 * handling are decided once.
 *
 * The system prompt is stable per feature and cached; the note is volatile and
 * goes after it, so the cache is a prefix hit on every call.
 */
type OutputFormat = NonNullable<
  NonNullable<Anthropic.Messages.MessageCreateParams['output_config']>['format']
>;

export async function structured<T>(opts: {
  model: string;
  system: string;
  user: string;
  format: OutputFormat;
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
}): Promise<{ value: T; model: string; inputTokens: number; outputTokens: number }> {
  const message = await client().messages.parse({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: opts.user }],
    output_config: { format: opts.format, effort: opts.effort ?? 'low' },
  });

  if (message.stop_reason === 'refusal') {
    throw new Error(
      'The model declined this note. Nothing was generated — the note is untouched on your device.',
    );
  }
  if (message.parsed_output === null || message.parsed_output === undefined) {
    throw new Error('The model returned nothing usable. Try again.');
  }

  return {
    value: message.parsed_output as T,
    // What actually served the request, which can differ from what was asked
    // for. The meter must report the model that was billed, not the one we
    // hoped for.
    model: message.model ?? opts.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
