import { z } from 'zod';

/**
 * What an organisation model may look like when it arrives over the wire.
 *
 * Bounded on purpose. The context travels with every request, and an unbounded
 * one becomes an unbounded prompt — expensive, slow, and eventually a request
 * that fails for a reason nobody can see from the screen.
 */
export const OrgContextSchema = z.object({
  entries: z
    .array(
      z.object({
        kind: z.enum(['person', 'client', 'system', 'product', 'term']),
        name: z.string().min(1).max(120),
        about: z.string().max(400),
      }),
    )
    .max(300),
});
