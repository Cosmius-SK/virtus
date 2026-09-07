/**
 * Turning a failure into a sentence a person can act on.
 *
 * This exists because of how it will fail: in front of a leader, on a
 * conference-room network, with everyone watching. A stack trace or a bare 500
 * on the screen ends the meeting; "your network blocked this" does not.
 *
 * Every message says what happened and what to do. None of them say "error".
 */
export interface Friendly {
  message: string;
  /** Whether pressing the same button again is worth doing. */
  retry: boolean;
}

export function friendly(raw: unknown, status?: number): Friendly {
  const text = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '';
  const lower = text.toLowerCase();

  if (lower.includes('aborted') || lower.includes('timeout') || lower.includes('timed out')) {
    return {
      message: 'That took longer than expected and stopped. Long notes take longer — try again, or split the note in two.',
      retry: true,
    };
  }
  if (lower.includes('network blocked') || lower.includes('returned a web page')) {
    return {
      message: 'Your network blocked this. Corporate proxies return a web page instead of an answer, which looks like a refusal but is not one.',
      retry: false,
    };
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('econnrefused')
  ) {
    return { message: 'Could not reach the server. Check the connection and try again.', retry: true };
  }
  if (lower.includes('credentials') || lower.includes('api key') || lower.includes('anthropic_api_key')) {
    return {
      message: 'The model is not configured on this deployment. Add ANTHROPIC_API_KEY in the hosting settings.',
      retry: false,
    };
  }
  if (lower.includes('declined')) {
    return {
      message: 'The model would not process that note. Nothing was generated and the note is untouched.',
      retry: false,
    };
  }
  if (status === 429 || lower.includes('rate limit')) {
    return { message: 'Too many requests at once. Wait a few seconds and try again.', retry: true };
  }
  if (status === 413 || lower.includes('longer than one pass')) {
    return { message: 'That note is longer than one pass can hold. Split it in two.', retry: false };
  }
  if (status && status >= 500) {
    return { message: 'The service had a problem with that one. Trying again usually works.', retry: true };
  }
  // Anything left is a message we did not write, and the whole point of this
  // file is that such a message never reaches the screen. Pass one through only
  // when it already reads as a sentence someone wrote on purpose.
  if (sentence(text)) return { message: text, retry: true };
  return { message: 'That did not work. Trying again usually helps.', retry: true };
}

function sentence(text: string): boolean {
  const t = text.trim();
  return t.length >= 25 && t.length <= 300 && /^[A-Z]/.test(t) && /[.!?]$/.test(t) && !t.includes('\n');
}
