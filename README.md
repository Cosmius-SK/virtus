# Virtus

*A work companion, built on biblio's foundations. Latin: worth, excellence — the
thing a person is left free to bring once the mundane half of the job is taken
off them.*

A personal AI partner for corporate work. It takes the mess — a spoken thought
after a meeting, a page of notes, a half-formed argument — and turns it into the
thing the job actually requires. Built in-house, for colleagues. Not for sale.

`docs/brief.md` is the handoff brief this is built to. Section numbers cited in
the code refer to it.

## Running it

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run dev
```

Then answer the question in §5 before anyone puts real client material in the
box, and set `VIRTUS_AI_PROVIDER` and `VIRTUS_CLASSIFICATION` to match. Virtus
tells you what it is currently doing at `/api/where` and in the page footer.

| Variable | Default | What it decides |
|---|---|---|
| `VIRTUS_AI_PROVIDER` | `anthropic` | Which provider the text goes to. One module honours it: `lib/ai/provider.ts`. |
| `VIRTUS_CLASSIFICATION` | unset | The firm's classification line, said plainly rather than discovered in a security review. |
| `VIRTUS_MODEL_STRUCTURE` | `claude-opus-5` | The structure pass. |
| `VIRTUS_MODEL_OUTLINE` | `claude-opus-5` | The outline pass. |
| `VIRTUS_DECK_FOOTER` | `Internal` | Footer on every slide. |

## The shape of it

Everything is **an endpoint first and a screen second** (§7). The web app is the
first caller, not the owner — when the plugin arrives it calls these same three
and needs no pipeline of its own.

```
note ──▶ POST /api/structure ──▶ POST /api/outline ──▶ [ the person edits ] ──▶ POST /api/deck ──▶ .pptx
         fixed fields,             claim + support           choosing, not         renders only what
         never prose               + shape per slide         correcting            they approved
```

`POST /api/where` — where the text goes, said plainly.

The middle step is the product. **Do not generate a deck from a note**: generate
the argument, let the person fix it in ten seconds, and only then make slides.
Choosing terminates; correcting does not.

## Layout

| Path | What it holds |
|---|---|
| `lib/ai/provider.ts` | The one module that decides provider, endpoint, key and model (§5). |
| `lib/ai/structurePrompt.ts` | Messy input → fixed fields. Nothing invented. |
| `lib/ai/outlinePrompt.ts` | Fields → the argument, in seven shapes. |
| `lib/deck/master.ts` | One brand master, defined in code — not read from a `.potx` (§6). |
| `lib/deck/render.ts` | Approved outline → a real, fully editable `.pptx`. Every shape degrades to bullets. |
| `lib/db.ts` | Local-first storage. Private thinking and finished artefacts as separate record classes; an owner id on every record (§4). |
| `lib/drafts.ts` | Debounced local save; the beacon body computed before the moment, not during it (lesson 12.3). |
| `lib/names.ts` | Lifted from biblio. Puts back the names dictation mangles, from a list you hold. |
| `lib/owner.ts` | The user is read from a session, never assumed. |

## The seven shapes, and no more

`title` · `contents` · `statement` · `bullets` · `two-column` · `chart` ·
`next-steps`

Three read their support list by convention, and every convention degrades to
bullets rather than breaking a slide:

- `two-column` — each item is `left || right`
- `chart` — each item is `Label: 42`; a chart with no real figures becomes bullets
- `next-steps` — each item is an action, `Owner — action — when`

## No microphone

Deliberate, and it cost biblio a week to learn (lesson 12.1). The browser's
speech API commits each word as it is spoken with almost no lookahead: no
punctuation, and names replaced by the nearest word it knows. Virtus points at
the dictation already on the device — `Windows + H`, the mic key on a Mac, the
mic on a phone keyboard — and does not offer a worse button beside it, because
the easier path is the one people take and then judge the product by.

## The test that decides whether this is real

Take a real note. Generate. Open it in PowerPoint. **Present it without editing
a single slide.** If you cannot, the fix is almost always in the outline step,
not in prettier slides.

## Not built yet

In §13 order: the organisation model (seeded by an offer at the first generic
result, never a setup wizard), sync, company sign-in, sharing, `.docx` and
`.pdf`, and the MCP server — a few hundred lines on top of the endpoints above.
