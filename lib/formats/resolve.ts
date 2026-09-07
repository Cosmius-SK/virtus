import 'server-only';
import { FormatDefSchema } from './def-schema';
import { formatById } from './registry';
import type { FormatDef } from './types';

/**
 * The format a request is about — from the registry, or carried in the request.
 *
 * A template built in the admin space lives on the device, so it arrives with
 * the call rather than being looked up (§7). That keeps the endpoints stateless,
 * which is the property that makes the MCP plugin a wrapper rather than a second
 * pipeline: a caller with its own template passes it the same way this screen
 * does, and no endpoint needs a database to answer.
 *
 * Anything carried in is validated. The registry's entries are checked by the
 * compiler; these are not, and the endpoint that turns a definition into a
 * prompt should not be where it is discovered that a section has no id.
 *
 * The id in the path still wins when it names a built-in. A request cannot
 * quietly redefine `weekly-status` for itself.
 */
export function resolveFormat(
  id: string,
  carried: unknown,
): { format: FormatDef } | { error: string; status: number } {
  const built = formatById(id);
  if (built) return { format: built };
  if (carried === undefined || carried === null) {
    return { error: 'No such template.', status: 404 };
  }
  const parsed = FormatDefSchema.safeParse(carried);
  if (!parsed.success) {
    return {
      error: `That template is not usable: ${parsed.error.issues[0]?.message ?? 'it is malformed.'}`,
      status: 400,
    };
  }
  if (parsed.data.id !== id) {
    return { error: 'The template sent does not match the one asked for.', status: 400 };
  }
  return { format: parsed.data as FormatDef };
}
