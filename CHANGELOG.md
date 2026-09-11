# Changelog

The changelog is the single source of release notes. It is written before
shipping and parsed at build time by `next.config.mjs`. There is no second copy.

## 0.15.1 — The broadcast that said it was up

A message typed into the admin broadcast panel and saved did not appear, and
the panel said "Saved. It is at the top of the page." That sentence was false,
and being false is worse than the banner not showing: it sends somebody away
believing the notice is up.

- **The control is now the action.** The on/off toggle sat in a row beside the
  three tone chips, so it read as a fourth chip — a label describing a state
  rather than a button changing one. It has been replaced by buttons named for
  what they do: **Show this banner**, **Save without showing**, **Save changes**,
  **Stop showing it**. What the primary button says depends on whether a message
  is currently up.
- **What people will see is on the screen.** The panel renders the live strip
  underneath the fields, using the same component the frame uses. A preview that
  is a second implementation is a preview that can disagree with the product;
  this one cannot.
- **The confirmation reads the state it confirms.** `savedMessage()` in
  `lib/admin/banner.ts` is derived from the saved record — no message, saved and
  not shown, or up on every screen. `test/banner.test.ts` guards it, and
  `isShowing()` is the one predicate deciding whether a strip appears anywhere.

## 0.15.0 — Something to show somebody

Virtus now has three things a person outside the team can look at without an
account.

- **A public page at `/about`.** One self-contained file — every image inlined,
  no external requests — so it renders with no network and can be emailed as an
  attachment to somebody who will not click a link. It is written as a case
  rather than an advertisement: what problem it removes, what it costs to run,
  and what leaves the building. That last one is a table, and it is the most
  useful block on the page.
- **A one-minute video.** Built as a web page and screen-recorded, so it is a
  real render of the real application rather than a re-creation. Silent, so it
  can play in a room where somebody is talking over it.
- **A README** that can be read in four minutes or skimmed in thirty seconds.

Every picture in all three is the real application. Nothing is a mock-up, and
the page links the actual `.pptx`, `.docx` and `.pdf` a real note produced — not
pictures of them.

`/about` and `/media/` are now outside the passcode gate, and nothing else is.
`docs/kit.md` is the recipe, including the six traps this run actually hit.

## 0.14.1 — What counts as a risk, and how it is written

Three things the first real status report got wrong. All of them are hints, not
code — which is the point: the care goes in the hints.

- **A fact is not a risk.** The first test produced six, of which three were
  facts — an environment not updated, somebody on leave, work carried over
  again. All true, all in the note, none of them risks, and each one crowding
  out something that was. The test is now stated: it has to be something that
  could still go wrong *and* would cost something if it did.
- **Their words, not their sentences.** A risk read "asked for 3 weeks ago,
  marcus chased twice, they say next week every week" — the story of how it came
  up, in a cell where a director expected a heading. Their terms, names and
  numbers stay exactly as given; the sentence gets written. It says "Northgate
  API spec 3 weeks overdue" now.
- **One fact, one section.** Somebody's leave appeared in Upcoming Activities
  and again in Risks. The same fact in two places makes a thin document look
  padded and a full one look careless.

Applied to every format that asks for a risk — a new test found two that had
been missed — and the writing rule extends to RAID's Issues, which also has to
be told apart from its Risks.

## 0.14.0 — Type that fits, and risks that are never dropped

Two problems from the same cause: the design was deciding things only the
content knows.

- **Boxes are sized by what is in them.** "Key Decisions: None" held a box two
  thirds empty while the section beside it ran past its own edge, because every
  box got the height its format declared and every font a fixed size. Sections
  now grow and shrink around the declared height — within bounds, so one long
  section cannot redesign the page — and the type is sized to the room it ends
  up with.
- **Three risks was a guess.** It held until a project had four. How many rows
  fit is now measured, and what does not fit is never silently dropped: by
  default it continues on another slide, or, if you choose to keep one page, the
  slide names how many were left off. The choice appears on the review screen
  only when something is actually too long. Word and PDF are unaffected — only a
  slide has an edge.

## 0.13.3 — A quill, and a broadcast that broadcasts

- **The broadcast strip did not appear until the page was reloaded.** The row
  saved correctly; the header never heard about it. The admin panel and the
  header each read the settings into their own state, so saving updated one and
  left the other showing what it had read on page load. There is now one shared
  copy with subscribers, and `BroadcastChannel` carries it to other tabs — which
  for a notice everybody is meant to see is the behaviour anyone would assume.
- **The wait is a quill writing.** Three lines of ink laid down in bursts, with a
  beat at the end of each word and a longer one at the end of a line, and a nib
  that rides the path so it is always at the wet end of the stroke. It covers the
  screen, because there is nothing else to do while a document is being written
  and a modal that says so is more honest than a page that looks available and is
  not. It also says what the next screen is for, which is where the rewrite
  control lives.

## 0.13.2 — Landing at the top of the screen you just opened

Choosing a template from halfway down the store left you halfway down the form,
past the sentence explaining what the form is for. Every stage now starts at the
top of its own screen.

That was the real cause of a control being reported missing twice: the rewrite
lives on the screen *after* the one being looked at, and the line saying so was
scrolled off. The fill screen now says what happens next in two places — in the
opening line, and on the sticky bar beside the button, which is visible however
far down you are.

## 0.13.1 — It works on a phone, and the rewrite can be found

The per-section rewrite was reported as missing. It was not missing — six of
them were on the screen. Each was a 14px pale grey glyph pinned to the far right
of a full-width row, hundreds of pixels from the heading it acted on, with no
word beside it. An unlabelled icon nobody has seen before, in the lightest
colour on the page, detached from its subject, is not a control. It is now a
labelled pill in the accent colour, sitting immediately after the section
heading, and the instruction above the document shows the same pill rather than
describing it.

There was no `<meta name="viewport">`. Without it a phone lays the page out at a
notional desktop width and scales the result down, so the header ran off the
side and every screen scrolled sideways.

The tag alone was not the fix, because the reason it had gone unnoticed was that
the header could not fit a phone either: five links in a fixed row made the
whole document wider than the screen, and a stretched layout viewport means
every `sm:` and `md:` below is measured against the wrong number and none of
them fire. One overflowing element does not look like one overflowing element —
it looks like the mobile layout was never written.

- The navigation collapses to a menu below `md`. The same five entries, laid out
  for the space there is.
- The classification line moves out of the header and becomes its own strip on
  narrow screens. Dropping it would have meant the one line governing what may
  be typed is missing from the device most likely to be used casually.
- The template shelves become one horizontally scrolling strip rather than three
  stacked rows before you reach a template; search goes full width.
- The action bar on the fill screen no longer sits on top of the last field.
- Gutters, cards and button rows across every screen.

Measured rather than eyeballed: at 360, 390, 430, 768, 1024 and 1440 the
document is exactly as wide as the window on every screen.

## 0.13.0 — An admin space

Twenty-six templates is a starting library, not a product. A team's own
documents are not in it and never will be, so the question is whether they can
add one — and until now the answer was "open the registry and write TypeScript".

- **A template store somebody can add to.** Name it, say who reads it, list its
  sections. The engine writes the schema, the prompt, the editing screen and all
  three outputs from that — which is what the "formats are data" decision was
  for, cashed in. Ids are never shown: they matter to the engine and to nobody
  using it. The preview is the same one the store draws, updating as you type.
- **A house style, read out of a file the firm already uses.** Upload a .pptx,
  .potx, .docx or .dotx and every document adopts its accents and typefaces. The
  alternative was a colour picker, which asks the wrong person the wrong
  question — nobody knows their firm's accent colour as a hex value. It reads
  the theme and nothing else: no layouts, no masters, no logos. Status colours
  are exempt, because a firm whose brand colour is red does not get to make
  "Delayed" look calm. Nothing about the uploaded file is stored.
- **A broadcast strip**, editable without a redeploy, for things that are true
  now and will not be true forever. Deliberately separate from the
  classification line, which is a control set by whoever deployed this and
  cannot be edited from inside — a control the people bound by it can switch off
  is not a control.
- Templates built here **travel with the request** rather than being looked up,
  the way the organisation model already does. The endpoints stay stateless,
  which is the property that keeps the MCP plugin a wrapper rather than a second
  pipeline. Anything arriving that way is validated before a prompt is built
  from it.
- The palette became **request-scoped** to make the house style safe. A
  module-level variable assigned before rendering is a race between two requests
  on one server, and the way it fails is one firm's document coming out in
  another firm's colours — wrong in a way that still opens, still looks
  finished, and has already been sent.
- **An organisation to try it against.** The world model is the feature, and an
  empty one demonstrates nothing.

Honest limitation, said on the screen rather than discovered: the 26 templates
that ship are part of the application and are on every device. One built here is
not — it is in that browser until there is a shared store. Every template
exports and imports as a file, which is a stopgap that admits to being one.

## 0.12.0 — Two front doors

Twenty-six templates in a flat list is not a choice, it is a search problem. And
someone who does not yet know which document they want cannot pick from a list
at all. So there are now two ways in, and one pipeline behind both.

- **A template store.** Templates sit under five categories, searchable, each
  with a preview of the shape it produces. The preview is drawn from the
  template's own section list rather than being a screenshot — a screenshot is a
  file somebody has to remember to regenerate, and it is wrong the first time a
  section moves.
- **Free-form.** A conversation for people who know what happened but not what
  it should become. It asks about substance rather than preferences, one
  question at a time, then proposes a template and a plan and waits to be told
  yes. It never writes the document itself: agreeing to the plan hands over to
  the same endpoints the store uses. A proposal naming a template that does not
  exist is downgraded rather than trusted.
- **Virtus's own identity**, in `lib/brand.ts` and one shared SVG path — kept
  deliberately separate from `lib/deck/master.ts`, which is the *client's* house
  style. What the product looks like and what its output looks like are two
  different questions, and merging them is how a tool starts signing other
  people's documents.
- **Every line of copy rewritten** for a reader who is at work. The old
  headline described the machine; the new one describes the job.

## 0.11.0 — Packs

Some documents are circulated and some are presented. A one-pager is handed
over; a pack is walked through. The section list does not know which meeting it
is in, so a format now says which room it gets.

- **Steering committee pack** and **programme review pack** — a cover, then one
  slide per section, with the caps that keep a one-pager readable lifted because
  a whole slide has room.
- 26 formats.

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
