# The presentation kit — how the page and the video were made

Virtus has three things somebody outside the team can look at without an
account: this repository's README, a public page at `/about`, and a one-minute
video. This is how to rebuild them.

Everything here is either a decision already made, a command known to work, or a
trap that already cost time once.

---

## 0 — What it is for

biblio's public page was an **advertisement**. Virtus is in-house and not for
sale, so its page is a **case**: what problem it removes, what it costs to run,
what it does with company data, and who can see what. Warmth is fine.
Persuasion by mood is not — nobody signs off a tool for their team because a
landing page felt nice.

One hard rule: **every picture is of the real thing.** Every image on the page
and in the video is a real render of the real application, captured from a real
build. Nothing is a mock-up, and nothing shows a feature that is not built.

| Thing | Virtus's answer |
|---|---|
| The logo | `app/icon.svg` — one path, shared with the header |
| A real example | The Atlas week 34 status report, from `docs/test-notes.md` |
| The signature image | The review screen: every fact, editable, before any file exists |
| The palette | accent `#F4531C`, ink `#131A24` (`lib/brand.ts`) |
| The public URL | Set with `--base`; see §2 |
| Who is reading | A leader deciding whether their organisation should run this |

---

## 1 — Capturing the screens

The page and the video both read their images from `/tmp/kit/`. Build a
production bundle first — a dev build shows dev overlays.

```bash
VIRTUS_CLASSIFICATION="Internal, non-confidential or public use only. No Restricted material." \
  npm run build
PORT=3300 npx next start -p 3300 &
npm i --no-save playwright ffmpeg-static
```

Capture at **1440×810** (exactly 16:9) with `deviceScaleFactor: 2`. Anything
else has to be cropped to fit a video frame, and the crop always lands
mid-sentence.

The review screen has no route of its own — it is a stage inside `app/page.tsx`
reached only after a model call. Mount `DocEditor` on a throwaway page with a
real approved document, screenshot it, and delete the page. The document to use
is in this file's sibling, `docs/test-notes.md`, note 1.

Then size them for the web:

```bash
FF=$(node -e "process.stdout.write(require('ffmpeg-static'))")
"$FF" -y -i shot.png -vf "scale=1280:-2:flags=lanczos" -q:v 6 /tmp/kit/web/shot.jpg
```

> **Trap — a fresh browser context per shot.** Typing into a template saves a
> draft, and the next screenshot of the Compose page then shows a "picked up
> where you left off" row. Worse, `getByText('Weekly status report')` starts
> matching that row instead of the store card, and the run fails on a timeout
> that looks like a missing element.

> **Trap — never `pkill -f "next start"`.** The pattern matches the shell that
> invoked it and kills the session. Start each server on a new port instead.

---

## 2 — The page

One self-contained HTML file: every image inlined as base64, no external
requests, no fonts to fetch. It renders identically with no network, and the
file itself can be emailed to somebody who will not click a link.

```bash
python3 docs/build_site.py --base https://your-deployment
```

That writes two byte-identical copies: `public/about.html`, which the app
serves, and `docs/site.html`, which you can attach to an email. The video is
referenced by **absolute URL** so the emailable copy still plays it; the poster
frame is inlined, so the file shows something even with no network at all.

Two wiring changes make the file a link, both already in the repo:

```js
// next.config.mjs
async rewrites() {
  return [{ source: '/about', destination: '/about.html' }];
}
```

```ts
// middleware.ts
function isPublic(pathname: string): boolean {
  return pathname === '/about' || pathname === '/about.html' ||
         pathname.startsWith('/media/') || pathname === '/icon.svg' ||
         pathname === '/apple-icon.svg';
}
```

> **Trap — `public/` is behind the gate.** The middleware matcher excludes
> Next's own static assets but not arbitrary files in `public/`. A video dropped
> in there asks a stranger for a passcode nobody gave them. Verify it, do not
> assume it:
>
> ```bash
> VIRTUS_PASSCODE=testcode PORT=3311 npx next start -p 3311 &
> for p in / /admin /about /media/walkthrough.mp4; do
>   curl -s -o /dev/null -w "$p %{http_code}\n" "http://localhost:3311$p"
> done
> # / and /admin must be 307; /about and /media/* must be 200.
> ```

> **Trap — brace escaping in `build_site.py`.** The whole page is one f-string,
> so every literal CSS brace is doubled. Getting that wrong closes the
> stylesheet early and silently drops every rule after it — the page still
> renders, just wrong. Check a generated `@keyframes` block ends with one `}`.

---

## 3 — The video

Do **not** use a video connector. Figma exports a Figma timeline, and the
generative tools will happily produce beautiful footage of a product that is not
yours. Build the animation as a web page and record the screen: what you get is
a real render, and re-recording after a change takes about a minute.

**Build `video.html`** — a single 1600×900 page with a stack of cards and a
timing engine the recorder drives through two globals:

```js
const HOLD = [3800, 6600, 6400, 6200, 6600, 5600, 5600, 6600, 5800, 5400]; // ms
window.__start = () => { window.__done = false; i = 0; step(); };
```

Ten cards, about a minute. Card order — adapt the middle, keep the ends:

1. The mark, breathing.
2. The problem, as a fragment of a real note.
3. What it becomes.
4. The signature image, full frame.
5. What the model is told — the invariants. This is the differentiator.
6. The organisation model.
7. One section, rewritten.
8. **What never leaves.** The trust card.
9. What it costs.
10. The mark, one line, the URL.

**Record it** with the pre-installed Chromium. Nothing is written until the
**context** closes — closing only the page loses the file.

```js
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1600, height: 900 } },
});
// ... await page.evaluate(() => window.__start());
// ... await page.waitForFunction(() => window.__done === true);
await ctx.close();
```

**Convert it.** Playwright's bundled ffmpeg is a stripped VP8-only build.

```bash
npm i --no-save ffmpeg-static
"$FF" -y -i raw.webm -vf "fps=30,scale=1600:900:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -movflags +faststart walkthrough.mp4
"$FF" -y -ss 2.5 -i walkthrough.mp4 -frames:v 1 -q:v 4 poster.jpg
```

`+faststart` lets it play before it has fully downloaded. `yuv420p` is what
makes it play on iPhones and in PowerPoint. Neither is optional.

**Then look at it.** Probing the streams tells you the file is valid; it does
not tell you the text is off the edge or a font fell back.

```bash
for t in 2 14 28 41 53; do
  "$FF" -y -ss $t -i walkthrough.mp4 -frames:v 1 -vf scale=900:-1 frames/f$t.png
done
```

Targets: 1600×900, 30 fps, H.264 High, under 5 MB, **silent** — so it can play
in a room where somebody is talking over it.

> **Trap — `const chrome = ...` collides with Chromium's global `chrome`** and
> kills the whole script. `window.__start` comes back undefined and the
> recording silently produces nothing.

> **Trap — fonts.** There is no network inside the recording browser. Virtus
> avoids this by using only the system stack the application itself uses, which
> is installed. If you introduce a webfont, inline it as base64.

> **Trap — headless reports `prefers-reduced-motion: reduce`.** A CSS animation
> that works for a human renders as a still frame in a capture. Pass
> `reducedMotion: 'no-preference'` to the context, or you will "fix" an
> animation that was never broken.

---

## 4 — The way in

Virtus is gated by a shared passcode (`VIRTUS_PASSCODE`), not by an invite
queue: it is in-house, so the door is the firm's, not the product's. The page
says so plainly rather than offering a sign-up that goes nowhere.

When it is adopted, company sign-in replaces the passcode and only `lib/owner.ts`
changes — every record already carries an `ownerId`.

---

## 5 — Where the pieces live

| Piece | Path |
|---|---|
| README | `README.md` |
| README images | `docs/images/` |
| Page build script | `docs/build_site.py` |
| Served page | `public/about.html` |
| Emailable page | `docs/site.html` |
| Video, poster, sample outputs | `public/media/` |
| Public-path allow-list | `middleware.ts` |
| Clean-URL rewrite | `next.config.mjs` |

The video build files (`video.html`, `record.mjs`) are a fixture, rebuilt per
product rather than kept in the repository. Everything needed to recreate them
is in §3.

> **A caveat worth stating at the time, not after it fails:** any `claude.ai`
> artifact link produced along the way is private until sharing is turned on. If
> the ask is "a link anyone can open", host it yourself.
