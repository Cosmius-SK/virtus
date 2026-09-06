# Changelog

The changelog is the single source of release notes. It is written before
shipping and parsed at build time by `next.config.mjs`. There is no second copy.

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
