# Virtus — working notes for Claude

`docs/brief.md` is the handoff brief. Section numbers in the code and below refer
to it. Read it before changing anything structural; it records decisions that
were expensive to arrive at and are not style preferences.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Dexie/IndexedDB ·
`@anthropic-ai/sdk` · `pptxgenjs`. Node 22 (`.nvmrc`).

```bash
npm install
cp .env.example .env.local     # then add ANTHROPIC_API_KEY
npm run dev
npm run typecheck && npm run lint && npm run build
```

## The rules that are not negotiable

These come from the brief, and each one cost real time in biblio.

1. **Endpoint first, screen second** (§7). The pipeline lives behind API routes,
   never inside React components. The web app is the *first caller*, not the
   owner — an MCP plugin is the second, and it must not need a rewrite. If you
   find yourself putting pipeline logic in a component, stop.
2. **Approve the argument, then render** (§6). Never generate a deck from a
   note. Note → structure → outline → *the person edits* → slides. Never
   regenerate a whole deck to fix one slide.
3. **Choosing terminates; correcting does not** (§8.2). Let people choose from
   structure rather than correct a result in adjectives. This is why there is no
   "try again" button on the outline screen, and why adding one would be a
   regression rather than a feature.
4. **Nothing invented** (§8.5). Summaries, entities and structure must be
   faithful to what the person actually wrote. A work tool that embellishes is
   worse than none: its output will be sent to a client. If a note is thin, the
   output is thin — that is correct, not a bug to fix in the prompt.
5. **Seven slide shapes, and no more** (§6). `title` `contents` `statement`
   `bullets` `two-column` `chart` `next-steps`. An eighth is always tempting and
   is never why someone adopts or drops this.
6. **One module decides where the text goes** (§5). Every model call goes
   through `lib/ai/provider.ts`. Never construct an Anthropic client anywhere
   else, and never fall back to a default provider when the configured one
   fails — falling back is how internal documents reach somewhere nobody
   approved.
7. **Private thinking and finished artefacts stay separate** (§4). `db.notes`
   and `db.artefacts` are different tables on purpose. Sharing, retention and
   team libraries will land on `artefacts` alone. Do not merge them.
8. **Every record carries an `ownerId`, read from a session** (§4). Never assume
   there is one user, even while there is.
9. **No microphone** (lesson 12.1). biblio built one on the browser's speech API
   and removed it after a week. Point at the device's own dictation and do not
   offer a worse button beside it.
10. **The changelog is the single source of release notes** (§8.7). Written
    before shipping, parsed at build time by `next.config.mjs`. There is no
    second copy — do not add one.

## Shape conventions

Three shapes read their `support` list by convention. Every convention must
degrade to bullets rather than break a slide:

| Shape | Each support item |
|---|---|
| `two-column` | `left \|\| right` |
| `chart` | `Label: 42` — no real figures means bullets, never an invented number |
| `next-steps` | `Owner — action — when` |

## Where things live

| Path | What it is |
|---|---|
| `app/api/structure` | Note → fixed fields. The core pass. |
| `app/api/outline` | Fields → the argument. |
| `app/api/deck` | Approved outline → `.pptx`. No model call happens here. |
| `app/api/where` | Where the text goes, said plainly. |
| `lib/ai/provider.ts` | The only place that knows the provider, endpoint, key and model. |
| `lib/deck/render.ts` | One function per shape. |
| `lib/db.ts` | The list of record types lives here and **only** here (lesson 12.5). |

## Not built yet, in this order (§13.6)

The organisation model — seeded by an offer at the first generic result, **never
a setup wizard** (§3) — then sync, company sign-in, sharing, `.docx`/`.pdf`, and
the MCP server.

## The test that decides whether this is real

Take a real note. Generate. Open it in PowerPoint. Present it without editing a
single slide. If you cannot, the fix is in the outline step, not prettier slides.
