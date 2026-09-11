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
npm run typecheck && npm run lint && npm test && npm run build
```

## The rules that are not negotiable

These come from the brief, and each one cost real time in biblio.

1. **Endpoint first, screen second** (§7). The pipeline lives behind API routes,
   never inside React components. The web app is the *first caller*, not the
   owner — an MCP plugin is the second, and it must not need a rewrite. If you
   find yourself putting pipeline logic in a component, stop.
2. **Approve the facts, then render** (§6). Never generate a document from a
   note. Note → fields → *the person fixes them* → the file. Never regenerate a
   whole artefact to fix one part of it.
3. **Choosing terminates; correcting does not** (§8.2). Let people choose from
   structure rather than correct a result in adjectives. This is why there is no
   "try again" button on the outline screen, and why adding one would be a
   regression rather than a feature.

   The section rewrite in `DocEditor` is not that button, and the difference is
   worth holding on to: it acts on a **named part** and leaves every other part
   as approved, and it rewrites from the original input, so pressing it
   repeatedly gets different sentences and never new facts. A rewrite that took
   the whole document and an adjective would be the forbidden thing — which is
   why the whole-document one says out loud what it costs.
4. **Nothing invented** (§8.5). Summaries, entities and structure must be
   faithful to what the person actually wrote. A work tool that embellishes is
   worse than none: its output will be sent to a client. If a note is thin, the
   output is thin — that is correct, not a bug to fix in the prompt.
5. **Two ways in, one pipeline behind them** (§8.2). The template store and
   free-form mode are two front doors to the same endpoints: free-form ends by
   *choosing a template*, and from there the path is identical. If free-form
   ever grows its own generator, the product has two products in it and one of
   them is untested.
6. **A template built in the admin space is the same thing as one in the
   registry.** It is a `FormatDef`, it goes through the same engine, and no
   renderer, prompt or screen may be able to tell them apart — the moment one
   can, every one of them grows a branch and the twenty-seventh format costs
   what the first did. It lives on the device, so it **travels with the
   request** (§7) exactly as the organisation model does; the endpoints stay
   stateless and moving the storage later is a change of source, not of shape.
   Anything not written in the registry is validated before a prompt is built
   from it.
7. **Seven slide shapes, and no more** (§6). `title` `contents` `statement`
   `bullets` `two-column` `chart` `next-steps`. An eighth is always tempting and
   is never why someone adopts or drops this.

   **Shapes and formats are different axes.** Shapes are the vocabulary a deck
   is written in and stay at seven. Formats are the sentences: there should be
   many, and adding one adds no shapes. Conflating them is what makes generated
   documents feel like a straitjacket.
8. **One module decides where the text goes** (§5). Every model call goes
   through `lib/ai/provider.ts`. Never construct an Anthropic client anywhere
   else, and never fall back to a default provider when the configured one
   fails — falling back is how internal documents reach somewhere nobody
   approved.
9. **Private thinking and finished artefacts stay separate** (§4). `db.notes`
   and `db.artefacts` are different tables on purpose. Sharing, retention and
   team libraries will land on `artefacts` alone. Do not merge them.
10. **Every record carries an `ownerId`, read from a session** (§4). Never assume
   there is one user, even while there is.
11. **No microphone** (lesson 12.1). biblio built one on the browser's speech API
   and removed it after a week. Point at the device's own dictation and do not
   offer a worse button beside it.
12. **A slide has an edge; nothing falls off it silently.** Content that will not
    fit continues onto another slide, or the slide says how many rows were left
    off. Never a quiet `slice`. A risk that was on the review screen and is not
    in the file is how a risk nobody was told about reaches a document everybody
    signed — and it is invisible, because the file still opens.
13. **The changelog is the single source of release notes** (§8.7). Written
    before shipping, parsed at build time by `next.config.mjs`. There is no
    second copy — do not add one.

## How history should read

Written down because a Claude Code session cannot read past conversations —
this file is the only thing that carries a convention from one session to the
next, so anything learned the hard way belongs here rather than in someone's
memory of a chat.

**Every commit and pull request carries its reasoning**, and every merge commit
summarises what sat under it. This history is read later to reconstruct why a
thing is the way it is, so a message that only says *what* changed has failed —
say what was true before, what forced the change, and what you rejected.

**Merge commits, never squash.** Two commits that reasoned about different
things stay separately readable, and a squash welds their messages into one.

**Verify before you claim.** A commit message saying the tests pass means you
ran them. Where a guard is the point of the change, break it on purpose, watch
the test go red, and put it back — then say so in the message.

**Walk the path a person takes, not the path you designed.** The broadcast
banner was verified twice and shipped broken twice. The second time, the check
passed because the script set the state explicitly before saving — which nobody
does. Someone types a message and presses the obvious button. Drive a change
from an empty screen, in the order a person meets it, and only then from the
states you had in mind.

**A confirmation that does not read the state it confirms will eventually lie.**
"Saved. It is at the top of the page." was a constant string; the record said
`on: false`. A sentence about what happened is derived from what happened, or it
is decoration — and a false one is worse than none, because it stops the person
checking. Where such a sentence exists, it gets a test.

## Shape conventions

Three shapes read their `support` list by convention. Every convention must
degrade to bullets rather than break a slide:

| Shape | Each support item |
|---|---|
| `two-column` | `left \|\| right` |
| `chart` | `Label: 42` — no real figures means bullets, never an invented number |
| `next-steps` | `Owner — action — when` |

## Formats are data

A format is a list of named sections — `paragraph`, `list`, `table` or a row of
`fields` — with a hint saying what belongs there and what does not. One engine
builds the schema, the prompt, the editing screen and every output from it.

**Adding a format is adding an entry to `lib/formats/registry.ts`.** If you find
yourself writing a renderer or a prompt for one format, stop: the thing you want
is probably a new section kind, and that is a change to the engine that every
format gets.

The care goes in the **hints**, not the renderer. That is the only place to
correct what a generic model does badly — "a criterion nobody could fail is not
a criterion", "this is where honesty matters most", "do not reason out an impact
the note did not state". Write them for the person who will read the document.

A format declares its `outputs` (`pptx`, `docx`, `pdf`) and its `layout`
(`one-pager` or `pack`). A one-pager is circulated; a pack is walked through.

## Where things live

| Path | What it is |
|---|---|
| `lib/formats/registry.ts` | Every format. Add one here and nowhere else. |
| `lib/formats/types.ts` | What a format may say about itself. |
| `lib/formats/schema.ts` | Sections → the Zod schema the model fills. |
| `lib/formats/prompt.ts` | Sections → the prompt. The invariants live here, once. |
| `lib/deck/format.ts` | Sections → slides. One-pager and pack. |
| `lib/docs/format.ts` | Sections → Word. |
| `lib/pdf/format.ts` | Sections → PDF. |
| `lib/deck/master.ts` | The **client's** palette and typeface — what goes *into* a document. Request-scoped, so an uploaded house style cannot leak between two renders in flight. |
| `lib/deck/fit.ts` | How much room text needs and what size it has to be. Isomorphic on purpose — the editor needs the same answers. |
| `components/Writing.tsx` | The wait. A quill writing, over the screen, because there is nothing else to do. |
| `lib/deck/status.ts` | The status vocabulary and its colours. Its own file so the editor can read the names without pulling the palette into the browser — and because a house style must **never** change these. |
| `lib/house.ts`, `app/api/house` | Reading a theme out of an uploaded .pptx/.potx/.docx/.dotx. Six accents and two typefaces. Never layouts, masters or logos. |
| `lib/admin/`, `components/admin/`, `app/admin` | The admin space: templates built here, the broadcast strip, the house style. |
| `lib/formats/def-schema.ts` | A format definition, validated. Applies to anything not written in the registry. |
| `lib/formats/resolve.ts` | Which template a request is about — registry first, then whatever it carried. |
| `lib/brand.ts` | **Virtus's own** palette — what the product itself looks like. Never the same thing as the line above, and never merged with it. |
| `components/Logo.tsx`, `app/icon.svg` | The mark. One path, shared by both, so the tab and the header cannot diverge. |
| `components/Shell.tsx` | Header, navigation and the classification line. Every page is inside it. |
| `components/BroadcastStrip.tsx`, `lib/admin/banner.ts` | The one strip, drawn identically by the frame and by the admin preview, and the one predicate deciding whether it shows. A preview that is a second implementation is one that can disagree with the product. |
| `components/TemplatePreview.tsx` | A template's preview, drawn from its own sections. Never a screenshot — a screenshot is wrong the first time a section moves. |
| `lib/ai/provider.ts` | The only place that knows the provider, endpoint, key and model. |
| `lib/org/` | What the organisation knows about itself (§3). |
| `lib/meter.ts`, `lib/pricing.ts` | What a document cost, measured not estimated. |
| `lib/friendly.ts` | Failures, said in a sentence. Nothing raw reaches the screen. |
| `lib/gate.ts`, `middleware.ts` | The shared passcode. Unset means no gate. |
| `lib/db.ts` | The list of record types lives here and **only** here (lesson 12.5). |
| `app/api/format/[id]` | Note → fields. The core pass, for every format. |
| `app/api/compose` | The conversation behind free-form mode. It proposes a template and a plan; it never writes the document. |
| `app/api/rewrite/[id]` | One section, rewritten from the same input. Never the whole document. |
| `app/api/{deck,doc,pdf}/format/[id]` | Approved fields → a file. No model call. |

## Not built yet

Sync between devices, company sign-in, sharing, and the MCP server (§7). The
endpoints were built to be called without a browser, so the plugin is a wrapper
over calls that already exist rather than a second pipeline — keep it that way.

Known and deliberate: the organisation model lives on the device and travels
with each request. The brief asks for server-side (§7) and that is right once
there is a second caller; until then a server store would be the largest thing
in the codebase serving nobody. Moving it is a change of source, not of shape.

## What is tested, and what deliberately is not

Everything here guards one rule: **what the note did not say must not reach the
document**. That is where rule 4 lives in code, and it fails silently — the file
still opens, it is just wrong, and it has already been sent.

- `test/formats.test.ts` drives every format through every renderer, empty and
  filled, and asserts that nothing on the output traces back to anywhere but the
  input.
- `test/render.test.ts` covers the seven shapes degrading rather than being
  faked.
- `test/fit.test.ts` covers the one thing a slide can do that a document cannot:
  run out of room. It asserts that nothing approved on the screen is missing
  from the file, and that type shrinks on demand rather than always.
- `test/admin.test.ts` covers what the admin space lets somebody hand the
  engine: a template definition that did not come from the registry, and a
  palette that did not come from `master.ts`. Both fail silently — a malformed
  template still produces a file and an unapplied house style still produces a
  file — so every assertion there is paired.
- `test/banner.test.ts` covers the one sentence the admin space says about
  what it just did. It is there because that sentence was once a constant and
  was therefore sometimes false.
- `test/org.test.ts`, `test/friendly.test.ts`, `test/pricing.test.ts`,
  `test/gate.test.ts` cover their own small rules.

Do not add tests that call the model (a different answer every run, real money,
and flaky) or that assert visual layout (every design tweak would break them,
and tests people learn to ignore are worse than none). When you change the
renderer, check the new behaviour is still caught: break the guard on purpose,
confirm a test goes red, then put it back.

**Pair every negative assertion with a positive one.** Four tests here have
failed to catch their mutation while looking perfectly fine, and the pattern is
always the same: "the output does not contain X" cannot tell absence from
blindness. The worst was a PDF assertion that passed against compressed bytes it
could not read; its replacement returned an empty string for every file and
passed again. Always ask a green test: *what would this have failed on?*

Two traps the tests found, both worth knowing before touching a renderer:

- **pptxgenjs numbers chart parts from a counter global to the module**, so the
  second deck rendered in one process contains `chart2.xml`, not `chart1.xml`.
  Find chart parts by prefix, never by name.
- **pdf-lib compresses content streams and writes hex strings.** Use
  `test/pdf-text.ts` to read a PDF; matching raw bytes proves nothing.

## The check no test performs

Nothing here asserts layout, deliberately — but one measurement is worth taking
by hand whenever the frame or a screen changes, because it fails only on a
device nobody tried and it fails completely: **open every screen at 390px wide
and confirm `document.documentElement.scrollWidth` equals `window.innerWidth`.**

A single row wider than the phone makes the whole document wider than the phone.
The page then scrolls sideways, and because the layout viewport has stretched,
every `sm:` and `md:` below is measured against the wrong number and none of
them fire — so one overflowing element does not look like one overflowing
element, it looks like the mobile layout was never written. That is exactly what
happened: the header carried five links in a fixed row, and there was no
`viewport` meta tag to notice it against.

## The test that decides whether this is real

Take a real note. Generate. Open it in PowerPoint. Present it without editing a
single slide. If you cannot, the fix is in the outline step, not prettier slides.
