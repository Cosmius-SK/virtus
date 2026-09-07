# Changelog

The changelog is the single source of release notes. It is written before
shipping and parsed at build time by `next.config.mjs`. There is no second copy.

## 0.10.0 — PDF, and the third reader

- **PDF output** for every format. A slide is for presenting, a Word document is
  for editing, and a PDF is for sending to someone who should read it and not
  change it — which is most of the people a status report reaches.
- One honest compromise, written down in the code: the PDF uses Helvetica
  rather than the house typeface. Embedding Trebuchet MS means shipping a font
  licensed with Windows. The colours are the firm's; the letterforms are not.

## 0.9.0 — The organisation model, and a library

The world model is the feature; generation is one consumer of it (§3). This is
the part that stays valuable however good the models get.

- **What Virtus knows** — people, clients, systems, products and house
  terminology. Every document is written with the list in front of it, so
  spellings are right and the words are yours.
- **Offered, never configured.** Names appear as an offer under a finished
  document — "you mentioned these and Virtus does not know them" — because a
  settings page is a page nobody visits, and biblio learned that the expensive
  way.
- **Names are put back before the model sees the note**, using `lib/names.ts`,
  lifted from biblio on day one and finally doing its job. The box is left
  exactly as typed.
- **A library** of everything made on this device, re-downloadable as either a
  slide or a document without asking the model again.

## 0.8.0 — Word documents, and ten delivery formats

A format already described its sections as data. A Word document is a second
reader over the same structure — the dense view and the long one — so it cost an
engine rather than a product.

- **Word output.** Any format that declares it can be downloaded as `.docx`,
  properly styled in the house typeface, with real tables and headings.
- **Ten delivery formats**, most of them Word-first: user story, epic brief,
  business requirements, technical design, test plan, UAT sign-off, runbook,
  retrospective, RFC and handover.
- The fourteen slide formats all gained a Word version too — a status report in
  an email is a document, not a slide.
- Twenty-four formats in total, every one tested through both renderers.

## 0.7.0 — Built for the room it will be shown in

- **Nothing on screen is ever a stack trace.** Every failure becomes a sentence
  saying what happened and what to do, with a Try again button only where trying
  again could help. A message Virtus did not write itself never reaches the
  screen.
- **The wait is legible.** Elapsed seconds, what is being done, and a bar that
  approaches full without pretending to know when it will finish. After fifteen
  seconds it says so, which turns a worrying pause into an expected one.
- **Requests are bounded.** Ninety seconds, then a sentence — a spinner that
  turns forever leaves nothing to say to the room.
- **Four sample notes** to click, written the way real ones arrive: out of
  order, half-punctuated, with the important thing last.
- The note is never lost. Every failure message says so.

## 0.6.0 — What it costs, measured rather than claimed

- **A meter.** Every document made is recorded locally with its real token
  counts and the wall-clock time from pressing the button to having something to
  edit. Median rather than mean, so one cold start does not decide the headline.
- **A cost page** at `/case`, in two visibly separate halves: what Virtus
  measured, and arithmetic on assumptions you can change. Presenting an
  assumption as a measurement is the fastest way to lose a room that does this
  for a living.
- It says plainly what it does not claim — that the three minutes includes
  correcting the fields, that it saves the writing and not the knowing, and that
  the minutes-by-hand figure is yours and has not been measured.

## 0.5.0 — Fourteen formats, and an engine that makes the fifteenth cheap

Formats are described as data, not code. One engine builds the schema the model
fills, the prompt that tells it how, the screen that edits the result and the
slide itself — so adding a format is adding an entry to a registry.

- **Fourteen formats** an IT function actually writes: weekly status, RAID log,
  project charter, incident postmortem, change request, release notes,
  architecture decision record, cutover plan, service review, capacity report,
  vendor review, security posture, sprint review and budget status.
- A searchable picker, because by the twentieth format a dropdown is a guess.
- The weekly status one-pager is now one entry in that registry rather than a
  bespoke renderer. Its behaviour is unchanged; there is simply less of it.
- Every format is tested end to end — schema, prompt and render, empty and
  filled — so a malformed registry entry fails in CI rather than in a demo.

## 0.4.0 — A door with a lock on it

- **A shared passcode**, set with `VIRTUS_PASSCODE`. Leave it unset and there is
  no gate, which is what a local checkout wants and what lesson 12.10 asks for:
  fail open on a gate that can lock you out.
- The cookie is derived from the code rather than stored, so there is no session
  table to keep and changing the code signs everyone out — the behaviour you
  want the moment a code leaks.

## 0.3.1 — What the first real note taught it

A real weekly note went through the one-pager for the first time. The reading
step held up — it added the wave counts correctly and kept every number and
spelling as written — and it found three things the plan had not.

- **A doubt is for the author, never the reader.** The note said the programme
  was Closed while describing a wave still blocked, and the model said so — in
  the executive summary, which a director reads. Noticing was right; the place
  was wrong. Contradictions now have their own field, shown as a flag on the
  editing screen and never rendered onto a slide.
- **Impact is no longer inferred.** Two risks arrived with a consequence the
  note never stated. Reasonable inferences, but on a slide they read as the
  author's assertion. The field stays empty unless the note says otherwise.
- **Dates go in date columns.** "expect to close by 10-Sep" became the whole
  cell; it is now "10-Sep". A column is not a sentence.
- **Closed and Not Started** are statuses. The first note used one of them and
  the list did not have it.

## 0.3.0 — The weekly status one-pager

The first *format*. A format is not a shape: shapes are the vocabulary a deck is
written in and stay at seven, formats are the sentences and there should be
many. Adding a hundred formats needs no new shapes.

- **Weekly status report** — one dense slide, laid out in the regions the firm's
  own template uses: a banner, the project row with a status chip, an executive
  summary, key decisions, accomplishments beside upcoming activities, and a risk
  table with owners and closure dates.
- A choice on the capture screen: a deck, or a weekly status.
- The fields are edited before anything is rendered, the same way an outline is
  (§8.2) — correcting a laid-out table is fighting it; correcting a list is not.
- Every section is drawn even when empty. A status report with an empty risk
  table is a statement — "nothing raised" — and dropping the section would turn
  that statement into an absence nobody notices.

## 0.2.0 — The house style

Decks now come out in the firm's own colours and typeface rather than a
placeholder. §13 step 5: the seven shapes, then the brand master.

- The palette and Trebuchet MS, taken from the firm's own 2Q26 earnings deck by
  reading the colour operators and font table out of the file. `docs/brand.md`
  records what each colour is for and why.
- Trebuchet is set as the deck's *theme* font too, so a text box someone adds
  by hand after opening the file inherits it instead of falling back to Calibri.
- The chart series carries the firm's own order — green, deep blue, amber, red.
- The web app's accent moves with it, so the tool and the decks it makes look
  related.

## 0.1.0 — Day one

The whole of §13 steps 1–5, built endpoint-first so the plugin gets it for free.

- **Capture** — one box, saves as you type, works offline, survives a closed
  tab. No login, no folders, no title field.
- **Structure** — one model pass over the mess returning fixed fields
  (`title`, `points`, `questions`, `next`, `mentions`), never prose.
- **Outline** — the argument for a deck: slides, each with a claim, its
  support and a shape. Editable before anything is rendered.
- **Render** — a real `.pptx` from the approved outline, all seven shapes,
  against one brand master defined in code.
- Private thinking (`notes`) and finished artefacts (`artefacts`) are separate
  kinds of record from the first migration; every record carries an owner id.
- One module decides which model provider, endpoint and key is used.

Repo setup, so that a second pair of hands can run this and so a pull request
means something: ESLint (warnings fail), CI running typecheck, lint and build on
every PR, `.env.example`, a Node pin, `CLAUDE.md` carrying the brief's
non-negotiables, a licence, and a SessionStart hook that installs dependencies
in Claude Code on the web.

Tests, narrowly: that a chart with no real figures and a two-column slide with no
separator both degrade to bullets rather than being faked. Each guard was broken
on purpose to confirm the test goes red — a test that cannot fail is worse than
none. Nothing that calls the model is tested, and nothing about visual layout.
