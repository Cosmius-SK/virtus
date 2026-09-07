# Virtus

*A work companion, built on biblio's foundations. Latin: worth, excellence — the
thing a person is left free to bring once the mundane half of the job is taken
off them.*

Put the mess in — a dictated thought after a meeting, a page of notes, a
half-formed argument. Choose what it should become. Fix the facts before
anything is made. Get a real `.pptx`, `.docx` or `.pdf` in the house style.

Built in-house, for colleagues. Not for sale.

`docs/brief.md` is the handoff brief; section numbers in the code refer to it.
`docs/brand.md` records where the palette came from. `docs/test-report.md` says
what is tested and — more usefully — what is not.

## Running it

```bash
npm install
cp .env.example .env.local     # then add ANTHROPIC_API_KEY
npm run dev
```

| Variable | Default | What it decides |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. |
| `VIRTUS_AI_PROVIDER` | `anthropic` | Where the text goes. One module honours it: `lib/ai/provider.ts`. |
| `VIRTUS_CLASSIFICATION` | unset | The firm's classification line, said plainly rather than discovered in a security review. |
| `VIRTUS_PASSCODE` | unset | A shared code. Unset means no gate at all. |
| `VIRTUS_MODEL_STRUCTURE` | `claude-opus-5` | The reading pass. |
| `VIRTUS_MODEL_OUTLINE` | `claude-opus-5` | The outline pass. |
| `VIRTUS_DECK_FOOTER` | `Internal` | Footer on every artefact. |

## The shape of it

Everything is **an endpoint first and a screen second** (§7). The web app is the
first caller, not the owner — when the plugin arrives it calls the same ones.

```
note ──▶ POST /api/format/{id} ──▶ [ the person fixes the facts ] ──▶ .pptx  POST /api/deck/format/{id}
         fields, never prose        choosing, not correcting          .docx  POST /api/doc/format/{id}
                                                                     .pdf   POST /api/pdf/format/{id}
```

The middle step is the product. **Do not generate a document from a note**:
produce the fields, let the person fix them in a minute, and only then render.
Choosing terminates; correcting does not.

`GET /api/formats` lists what Virtus can make. `GET /api/where` says where the
text goes.

## Formats

A format is **data, not code** — a list of named sections, each a paragraph, a
list, a table or a row of fields, with a hint saying what belongs there and what
does not. One engine turns that into the schema the model fills, the prompt that
tells it how, the screen that edits the result, and every output.

Adding a format is adding an entry to `lib/formats/registry.ts`. No renderer, no
prompt, no screen.

**Project and delivery** — weekly status · RAID log · project charter · cutover
plan · budget status · sprint review · retrospective
**Operations** — incident postmortem · change request · release notes · runbook
· service review · capacity report · security posture · vendor review
**Engineering** — architecture decision record · technical design · RFC
**Requirements** — user story · epic brief · business requirements · test plan ·
UAT sign-off · handover
**Packs** — steering committee · programme review

Plus the multi-slide deck, which keeps its own outline-first flow and the seven
slide shapes.

## The three readers

One section list, three ways to read it:

| | For |
|---|---|
| **Slide** | Presenting. Dense, one page, nothing said twice. |
| **Word** | Editing. Room to write, lists not truncated, comments. |
| **PDF** | Sending to someone who should read it and not change it. |

A **one-pager** is circulated; a **pack** gives each section its own slide and is
walked through. The sections do not know which meeting they are in.

## What it knows

`/organisation` holds the people, clients, systems, products and house
terminology. Every document is written with that list in front of it, which is
the difference between generic output and output that is already yours (§3).

It is **offered, never configured**: names appear under a finished document,
where the reason to spend ten seconds is the thing on screen. biblio built its
cast as a settings page first and nobody visited it.

## What it costs

`/case` shows measured time and cost from real runs, kept visibly apart from
arithmetic on assumptions you can change — and says what it does not claim.

## No microphone

Deliberate, and it cost biblio a week (lesson 12.1). The browser's speech API
commits each word as it is spoken: no punctuation, names replaced by the nearest
word it knows. Virtus points at the dictation already on the device and does not
offer a worse button beside it.

Names are put back before the model sees the note, from the list you hold.

## The test that decides whether this is real

Take a real note. Generate. Open it. **Present or send it without editing a
thing.** If you cannot, the fix is in the fields step, not prettier output.

## Not built yet

Sync, company sign-in, sharing, and the MCP server — a few hundred lines on top
of the endpoints above, because they were built to be called without a browser.
