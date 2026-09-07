import { z } from 'zod';
import { CATEGORIES } from './types';

/**
 * A format definition, validated.
 *
 * Needed the moment a template can be built here rather than shipped: a custom
 * template lives on the device, so it travels with the request (§7) and arrives
 * at the endpoint as untrusted JSON. The registry's own entries are checked by
 * the compiler; these are not, and the endpoint that builds a prompt out of one
 * should not be the place that discovers a section has no id.
 *
 * The same schema validates a file somebody imports, so a template exported
 * from one device and dropped into another fails in the file picker with a
 * sentence rather than three screens later with a stack trace.
 *
 * Bounds are deliberate rather than defensive: a section list long enough to
 * exhaust a context window produces a document nobody can read anyway.
 */
const label = z.string().min(1).max(120);
const hint = z.string().max(600);
const id = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Ids are lower case, digits and hyphens.');

const ColumnSchema = z.object({
  id,
  label,
  hint,
  width: z.number().min(0.1).max(20),
});

export const SectionSchema = z.object({
  id,
  label,
  kind: z.enum(['paragraph', 'list', 'table', 'fields']),
  hint,
  height: z.number().min(0.2).max(6),
  beside: z.boolean().optional(),
  max: z.number().int().min(1).max(60).optional(),
  columns: z.array(ColumnSchema).min(1).max(8).optional(),
  fields: z.array(ColumnSchema).min(1).max(8).optional(),
});

export const FormatDefSchema = z
  .object({
    id,
    name: label,
    description: z.string().max(400),
    audience: z.string().max(200),
    category: z.enum(CATEGORIES),
    status: z.boolean(),
    outputs: z.array(z.enum(['pptx', 'docx', 'pdf'])).min(1).max(3),
    layout: z.enum(['one-pager', 'pack']).optional(),
    sections: z.array(SectionSchema).min(1).max(20),
  })
  // A table with no columns and a fields row with no fields both render as an
  // empty box and read as a bug in the tool rather than a gap in the template.
  .refine(
    (def) =>
      def.sections.every(
        (s) =>
          (s.kind !== 'table' || (s.columns?.length ?? 0) > 0) &&
          (s.kind !== 'fields' || (s.fields?.length ?? 0) > 0),
      ),
    { message: 'A table needs columns and a fields row needs fields.' },
  )
  .refine((def) => new Set(def.sections.map((s) => s.id)).size === def.sections.length, {
    message: 'Two sections share an id, so one would overwrite the other.',
  });
