# Changelog

The changelog is the single source of release notes. It is written before
shipping and parsed at build time by `next.config.mjs`. There is no second copy.

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
