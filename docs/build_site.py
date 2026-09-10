#!/usr/bin/env python3
"""
Assemble the public page for Virtus.

One self-contained HTML file: every image inlined as base64, no external
requests, no fonts to fetch. That matters twice over — it renders identically
for somebody with no network, and the file itself can be emailed to a person who
will not click a link.

The output is written to two places, byte for byte the same:

    public/about.html   what the app serves at /about
    docs/site.html      the copy you can attach to an email

Media that is too large to inline — the video — is referenced by ABSOLUTE URL,
so the emailable copy still plays it.

    python3 docs/build_site.py [--base https://your-deployment]

Editing an 800 KB file by hand is miserable. Edit this instead.
"""
from __future__ import annotations

import argparse
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = pathlib.Path('/tmp/kit/web')          # built by the capture step; see docs/kit.md
DEFAULT_BASE = 'https://virtus-cosmius.vercel.app'

ACCENT, ACCENT_DARK, INK, INK60, INK40 = '#F4531C', '#D8410E', '#131A24', '#586576', '#8A94A2'
LINE, PAPER, CANVAS, NIGHT = '#E3E7EC', '#FFFFFF', '#F5F7F9', '#1B2430'
MARK = 'M56 6 L44 21 L52 22 L38 35 L46 36 L31 48 L40 49 L23 58 L6 60 L13 43 L28 29 L42 16 Z'


def raw(path: pathlib.Path, mime: str) -> str:
    if not path.exists():
        sys.exit(f'missing: {path}')
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def img(name: str) -> str:
    """A JPEG as a data URI. Missing files fail loudly rather than silently."""
    path = IMG / f'{name}.jpg'
    if not path.exists():
        sys.exit(f'missing image: {path}\nRun the capture step first (docs/kit.md §1).')
    return 'data:image/jpeg;base64,' + base64.b64encode(path.read_bytes()).decode()


def version() -> str:
    text = (ROOT / 'package.json').read_text()
    return re.search(r'"version":\s*"([^"]+)"', text).group(1)


def mark(size: int, colour: str = ACCENT, vent: str = NIGHT) -> str:
    return (f'<svg viewBox="0 0 64 64" width="{size}" height="{size}" aria-hidden="true">'
            f'<path d="{MARK}" fill="{colour}"/>'
            f'<circle cx="14.8" cy="50.5" r="2.5" fill="{vent}"/></svg>')


def panel(name: str, title: str, body: str) -> str:
    return (f'<figure class="panel"><img src="{img(name)}" alt="{title}" loading="lazy">'
            f'<figcaption><b>{title}</b>{body}</figcaption></figure>')


def build(base: str) -> str:
    v = version()
    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Virtus — an in-house work companion</title>
<meta name="description" content="Virtus turns the notes people already write into the documents their role requires — reviewed before anything is produced, and faithful to what was actually written.">
<style>
:root{{--accent:{ACCENT};--accentDark:{ACCENT_DARK};--ink:{INK};--ink60:{INK60};
--ink40:{INK40};--line:{LINE};--paper:{PAPER};--canvas:{CANVAS};--night:{NIGHT};}}
*{{margin:0;padding:0;box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%}}
body{{background:var(--canvas);color:var(--ink);line-height:1.6;
font-family:ui-sans-serif,system-ui,'Segoe UI','Helvetica Neue',Arial,sans-serif;
-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1080px;margin:0 auto;padding:0 24px}}
a{{color:var(--accentDark)}}

header{{background:var(--night);color:#fff;position:sticky;top:0;z-index:10}}
header .wrap{{display:flex;align-items:center;gap:14px;height:60px}}
header b{{font-size:13px;font-weight:600;letter-spacing:.18em}}
.chip{{margin-left:auto;font-size:11px;border:1px solid rgba(251,191,36,.3);
background:rgba(251,191,36,.1);color:#FDE68A;padding:4px 10px;border-radius:4px}}

.hero{{padding:76px 0 8px;text-align:center}}
.hero h1{{font-size:clamp(34px,5.4vw,58px);line-height:1.08;letter-spacing:-.028em;font-weight:600}}
.hero h1 em{{font-style:normal;color:var(--accent)}}
.hero p{{margin:22px auto 0;max-width:660px;font-size:19px;color:var(--ink60)}}
.tag{{display:inline-block;margin-bottom:20px;font-size:12px;font-weight:600;
letter-spacing:.16em;text-transform:uppercase;color:var(--ink40)}}

/* The product's own writing animation, running live. Instant, no buffering —
   it starts before anybody has decided whether to stay. */
.quill{{margin:46px auto 0;max-width:520px;background:var(--paper);border:1px solid var(--line);
border-radius:10px;padding:26px 30px;box-shadow:0 1px 3px rgba(19,26,36,.06)}}
.quill svg{{width:100%;height:auto;display:block}}
@keyframes vink1 {{
  0% {{ stroke-dashoffset: 100; opacity: 1; }}
  5.04% {{ stroke-dashoffset: 78; }}
  6.44% {{ stroke-dashoffset: 76; }}
  12.88% {{ stroke-dashoffset: 50; }}
  14.56% {{ stroke-dashoffset: 48; }}
  22.4% {{ stroke-dashoffset: 16; }}
  24.36% {{ stroke-dashoffset: 12; }}
  28% {{ stroke-dashoffset: 0; }}
  92% {{ stroke-dashoffset: 0; opacity: 1; }}
  100% {{ stroke-dashoffset: 0; opacity: 0; }}
}}
@keyframes vnib1 {{
  0% {{ offset-distance: 0%; opacity: 1; }}
  5.04% {{ offset-distance: 22%; opacity: 1; }}
  6.44% {{ offset-distance: 24%; opacity: 1; }}
  12.88% {{ offset-distance: 50%; opacity: 1; }}
  14.56% {{ offset-distance: 52%; opacity: 1; }}
  22.4% {{ offset-distance: 84%; opacity: 1; }}
  24.36% {{ offset-distance: 88%; opacity: 1; }}
  28% {{ offset-distance: 100%; opacity: 1; }}
  28.01%, 100% {{ offset-distance: 100%; opacity: 0; }}
}}
@keyframes vink2 {{
  0%, 30.99% {{ stroke-dashoffset: 100; opacity: 0; }}
  31% {{ stroke-dashoffset: 100; opacity: 1; }}
  36.04% {{ stroke-dashoffset: 78; }}
  37.44% {{ stroke-dashoffset: 76; }}
  43.88% {{ stroke-dashoffset: 50; }}
  45.56% {{ stroke-dashoffset: 48; }}
  53.4% {{ stroke-dashoffset: 16; }}
  55.36% {{ stroke-dashoffset: 12; }}
  59% {{ stroke-dashoffset: 0; }}
  92% {{ stroke-dashoffset: 0; opacity: 1; }}
  100% {{ stroke-dashoffset: 0; opacity: 0; }}
}}
@keyframes vnib2 {{
  0%, 30.99% {{ offset-distance: 0%; opacity: 0; }}
  31% {{ offset-distance: 0%; opacity: 1; }}
  36.04% {{ offset-distance: 22%; opacity: 1; }}
  37.44% {{ offset-distance: 24%; opacity: 1; }}
  43.88% {{ offset-distance: 50%; opacity: 1; }}
  45.56% {{ offset-distance: 52%; opacity: 1; }}
  53.4% {{ offset-distance: 84%; opacity: 1; }}
  55.36% {{ offset-distance: 88%; opacity: 1; }}
  59% {{ offset-distance: 100%; opacity: 1; }}
  59.01%, 100% {{ offset-distance: 100%; opacity: 0; }}
}}
@keyframes vink3 {{
  0%, 61.99% {{ stroke-dashoffset: 100; opacity: 0; }}
  62% {{ stroke-dashoffset: 100; opacity: 1; }}
  65.96% {{ stroke-dashoffset: 78; }}
  67.06% {{ stroke-dashoffset: 76; }}
  72.12% {{ stroke-dashoffset: 50; }}
  73.44% {{ stroke-dashoffset: 48; }}
  79.6% {{ stroke-dashoffset: 16; }}
  81.14% {{ stroke-dashoffset: 12; }}
  84% {{ stroke-dashoffset: 0; }}
  92% {{ stroke-dashoffset: 0; opacity: 1; }}
  100% {{ stroke-dashoffset: 0; opacity: 0; }}
}}
@keyframes vnib3 {{
  0%, 61.99% {{ offset-distance: 0%; opacity: 0; }}
  62% {{ offset-distance: 0%; opacity: 1; }}
  65.96% {{ offset-distance: 22%; opacity: 1; }}
  67.06% {{ offset-distance: 24%; opacity: 1; }}
  72.12% {{ offset-distance: 50%; opacity: 1; }}
  73.44% {{ offset-distance: 52%; opacity: 1; }}
  79.6% {{ offset-distance: 84%; opacity: 1; }}
  81.14% {{ offset-distance: 88%; opacity: 1; }}
  84% {{ offset-distance: 100%; opacity: 1; }}
  84.01%, 100% {{ offset-distance: 100%; opacity: 0; }}
}}
.i1{{animation:vink1 4.4s linear infinite}}
.i2{{animation:vink2 4.4s linear infinite}}
.i3{{animation:vink3 4.4s linear infinite}}
.n1{{animation:vnib1 4.4s linear infinite}}
.n2{{animation:vnib2 4.4s linear infinite}}
.n3{{animation:vnib3 4.4s linear infinite}}
.nib{{opacity:0;offset-rotate:0deg}}
@media (prefers-reduced-motion:reduce){{.i1,.i2,.i3{{animation:none;stroke-dashoffset:0;opacity:1}}.nib{{display:none}}}}

section{{padding:64px 0}}
section.tight{{padding:40px 0}}
h2{{font-size:clamp(25px,3.4vw,34px);letter-spacing:-.02em;font-weight:600;margin-bottom:8px}}
.lede{{font-size:18px;color:var(--ink60);max-width:720px;margin-bottom:30px}}
p+p{{margin-top:14px}}

.video{{background:var(--night);padding:52px 0}}
.video .wrap{{max-width:1000px}}
.video video{{width:100%;border-radius:10px;display:block;background:#000}}
.video .row{{display:flex;flex-wrap:wrap;gap:18px;align-items:baseline;margin-top:16px;
color:#9AA6B4;font-size:14px}}
.video .row a{{color:#fff}}

.shot{{width:100%;display:block;border:1px solid var(--line);border-radius:10px}}
figcaption{{margin-top:12px;font-size:15px;color:var(--ink60)}}
figcaption b{{display:block;color:var(--ink);font-size:16px;margin-bottom:2px}}

.steps{{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}}
.step{{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:20px}}
.step b{{display:block;font-size:13px;color:var(--accent);letter-spacing:.1em;
text-transform:uppercase;margin-bottom:8px}}
.step p{{font-size:15px;color:var(--ink60)}}
.step h3{{font-size:17px;font-weight:600;margin-bottom:6px}}

table{{width:100%;border-collapse:collapse;background:var(--paper);
border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:15px}}
th,td{{text-align:left;padding:14px 18px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{background:var(--night);color:#fff;font-size:13px;letter-spacing:.06em;text-transform:uppercase}}
tr:last-child td{{border-bottom:0}}
td b{{display:block}}
td span{{color:var(--ink60)}}

.grid{{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}}
.card{{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:20px}}
.card h3{{font-size:16px;font-weight:600;margin-bottom:10px}}
.card ul{{list-style:none;font-size:15px;color:var(--ink60)}}
.card li{{padding-left:16px;position:relative;margin-bottom:7px}}
.card li:before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;
border-radius:50%;background:var(--accent)}}

.panels{{display:grid;gap:34px;grid-template-columns:repeat(auto-fit,minmax(420px,1fr))}}
.panel img{{width:100%;display:block;border:1px solid var(--line);border-radius:10px}}

.principles div{{border-top:3px solid var(--accent);padding-top:16px;margin-top:26px}}
.principles h3{{font-size:19px;font-weight:600;margin-bottom:6px}}
.principles p{{font-size:16px;color:var(--ink60);max-width:760px}}

.cost{{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}}
.cost div{{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:22px}}
.cost b{{display:block;font-size:38px;letter-spacing:-.03em;font-weight:600}}
.cost span{{font-size:14px;color:var(--ink60)}}

.door{{background:var(--night);color:#fff}}
.door h2{{color:#fff}}
.door .lede{{color:#9AA6B4}}
.door .grid{{margin-top:8px}}
.door .card{{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.12)}}
.door .card h3{{color:#fff}}
.door .card ul{{color:#9AA6B4}}

footer{{background:var(--night);color:#7E8B9A;font-size:13px;padding:26px 0 46px}}
footer .wrap{{display:flex;flex-wrap:wrap;gap:16px;align-items:center}}
.note{{background:#FFF1EA;border:1px solid rgba(244,83,28,.25);border-radius:10px;
padding:16px 20px;font-size:15px;color:#7A2E10;margin-top:26px}}
@media(max-width:640px){{section{{padding:44px 0}}.panels{{grid-template-columns:1fr}}}}
</style></head><body>

<header><div class="wrap">{mark(24, ACCENT, NIGHT)}<b>VIRTUS</b>
<span class="chip">Internal, non-confidential or public use only</span></div></header>

<div class="wrap hero">
  <span class="tag">An in-house work companion</span>
  <h1>You already did the thinking.<br>Virtus does the <em>formatting</em>.</h1>
  <p>It turns the notes people already write into the documents their role requires —
     and shows you every fact before it makes anything.</p>

  <div class="quill">
    <svg viewBox="0 0 240 84" role="img" aria-label="A quill writing">
      <line x1="10" x2="230" y1="27" y2="27" stroke="{LINE}" stroke-width="1"/>
      <line x1="10" x2="230" y1="51" y2="51" stroke="{LINE}" stroke-width="1"/>
      <line x1="10" x2="230" y1="73" y2="73" stroke="{LINE}" stroke-width="1"/>
      <path class="i1" d="M10 20 C 26 8, 38 30, 54 18 S 84 4, 100 18 S 130 30, 146 16 S 178 6, 194 20 S 216 26, 230 16"
        fill="none" stroke="{INK60}" stroke-width="2.2" stroke-linecap="round"
        pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
      <path class="i2" d="M10 44 C 28 34, 40 56, 58 44 S 88 30, 104 44 S 134 56, 150 42 S 182 32, 198 46 S 214 50, 224 42"
        fill="none" stroke="{INK60}" stroke-width="2.2" stroke-linecap="round"
        pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
      <path class="i3" d="M10 66 C 26 58, 38 76, 56 64 S 86 52, 102 66 S 126 74, 140 64"
        fill="none" stroke="{INK60}" stroke-width="2.2" stroke-linecap="round"
        pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>

      <g class="nib n1" style="offset-path:path('M10 20 C 26 8, 38 30, 54 18 S 84 4, 100 18 S 130 30, 146 16 S 178 6, 194 20 S 216 26, 230 16')">
        <g transform="translate(-1 -13) scale(0.34)"><path d="{MARK}" fill="{ACCENT}"/></g>
      </g>
      <g class="nib n2" style="offset-path:path('M10 44 C 28 34, 40 56, 58 44 S 88 30, 104 44 S 134 56, 150 42 S 182 32, 198 46 S 214 50, 224 42')">
        <g transform="translate(-1 -13) scale(0.34)"><path d="{MARK}" fill="{ACCENT}"/></g>
      </g>
      <g class="nib n3" style="offset-path:path('M10 66 C 26 58, 38 76, 56 64 S 86 52, 102 66 S 126 74, 140 64')">
        <g transform="translate(-1 -13) scale(0.34)"><path d="{MARK}" fill="{ACCENT}"/></g>
      </g>
    </svg>
  </div>
</div>

<div class="video"><div class="wrap">
  <video controls preload="none" poster="{raw(ROOT / 'public' / 'media' / 'poster.jpg', 'image/jpeg')}" playsinline>
    <source src="{base}/media/walkthrough.mp4" type="video/mp4">
  </video>
  <div class="row">
    <span>One minute. Silent, so it can play while somebody talks over it.</span>
    <a href="{base}/media/walkthrough.mp4" download>Download the video</a>
  </div>
</div></div>

<section><div class="wrap">
  <h2>The problem is not the writing</h2>
  <p class="lede">It is Friday at twenty to six and the status report is due. The thinking
    was done days ago, in a note nobody else will ever read.</p>
  <p>What is left is an hour of moving that note into a shape somebody else expects: a
     summary, the things that moved, the things in the way, a table with owners and dates.
     Nothing in that hour requires judgement. All of it requires the person who has the
     judgement.</p>
  <p>Virtus takes that hour. It does not take the judgement — which is why every fact it
     extracts is put in front of you, editable, before a file exists.</p>
</div></section>

<section class="tight"><div class="wrap">
  <figure><img class="shot" src="{img('review169')}" alt="The review screen, with the extracted facts">
    <figcaption><b>Nothing has been produced yet.</b>
      Every field is shown, every field is editable, and where the note contradicts itself
      Virtus says so — to you, in a panel that never reaches the document.</figcaption>
  </figure>
  <div class="note" style="background:var(--paper);border-color:var(--line);color:var(--ink60)">
    <b style="color:var(--ink)">The files those fields produced.</b>
    Not pictures of them — the actual output, from the run above:
    <a href="{base}/media/atlas-week-34.pptx">slides</a> ·
    <a href="{base}/media/atlas-week-34.docx">Word</a> ·
    <a href="{base}/media/atlas-week-34.pdf">PDF</a>.
    Open them and check every line against the note.
  </div>
</div></section>

<section><div class="wrap">
  <h2>How it works</h2>
  <p class="lede">Four steps. The third is the one that matters.</p>
  <div class="steps">
    <div class="step"><b>One</b><h3>Choose a template</h3>
      <p>26 of them, grouped, each showing the shape of what it produces. Or describe what
         happened and let Virtus propose one.</p></div>
    <div class="step"><b>Two</b><h3>Put in what you know</h3>
      <p>The template opens as boxes, laid out the way the document is. Rough notes are
         expected. Anything you do not have, you leave.</p></div>
    <div class="step"><b>Three</b><h3>Approve the facts</h3>
      <p>Virtus reads it and shows you the fields. Correct anything, or have any single
         section written again. Still no file.</p></div>
    <div class="step"><b>Four</b><h3>Take the file</h3>
      <p>Slides, Word or PDF, in the firm's own colours. Re-issue it in another format
         later without paying for it twice.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <h2>What leaves the building</h2>
  <p class="lede">The question everybody in the approval chain will ask first, answered
     before they ask it.</p>
  <table>
    <tr><th style="width:50%">Stays on the device</th><th>Goes to the model</th></tr>
    <tr>
      <td><b>Your notes and drafts</b><span>Held in the browser's own storage. They are
        never uploaded, and no server here has a copy.</span></td>
      <td><b>The note you are turning into a document</b><span>For the seconds the call
        takes, under your organisation's own Claude Enterprise agreement.</span></td>
    </tr>
    <tr>
      <td><b>Every document you have made</b><span>The library is local. Re-issuing an old
        document in another format needs no model call at all.</span></td>
      <td><b>The organisation model, with that note</b><span>The names, systems and house
        words, so the writing comes back already yours.</span></td>
    </tr>
    <tr>
      <td><b>The organisation model itself</b><span>People, clients, systems, products and
        terminology — stored locally and sent only alongside a request.</span></td>
      <td><b>Nothing else, ever</b><span>No third party. No analytics on content. One
        module decides where text goes, and it never falls back to a different provider.</span></td>
    </tr>
  </table>
  <div class="note"><b>Not training data.</b> Calls run under the organisation's own
    enterprise agreement with Anthropic, which excludes customer content from training.
    Virtus adds no second destination — and if the configured provider fails it stops,
    rather than quietly trying another one.</div>
</div></section>

<section><div class="wrap">
  <h2>What it looks like</h2>
  <p class="lede">Every picture below is the real application. None of it is a mock-up.</p>
  <div class="panels">
    {panel('store169', 'The template store',
           'Twenty-six templates in five categories, each with a preview drawn from its own definition — so a template added tomorrow has a preview without anybody drawing one.')}
    {panel('fill', 'The template, opened',
           'A box per section, arranged the way the finished document is arranged, with the guidance the model is given shown above each one.')}
    {panel('writing', 'The wait',
           'A quill writing, over the screen. There is nothing else to do while a document is being written, and it says what the next screen is for.')}
    {panel('org169', 'The organisation model',
           'The people, clients, systems and house words this organisation uses. The part that keeps its value however good the models get.')}
    {panel('admin', 'Building a template',
           'A name, who reads it, a list of sections. The engine writes the schema, the prompt, the editing screen and all three outputs from that.')}
    {panel('broadcast', 'The broadcast strip',
           'A notice across every screen, changed without a deployment. Deliberately separate from the classification line, which an admin cannot edit.')}
  </div>
</div></section>

<section><div class="wrap">
  <h2>Everything it does</h2>
  <p class="lede">Not a summary. The list.</p>
  <div class="grid">
    <div class="card"><h3>Documents</h3><ul>
      <li>26 templates across delivery, operations, engineering, requirements and governance</li>
      <li>Slides, Word and PDF from the same approved fields</li>
      <li>One-pagers and multi-slide packs</li>
      <li>A custom deck with no template, approved as an outline first</li>
      <li>Seven slide shapes, each degrading rather than inventing</li>
      <li>Type sized to its box; long sections continue rather than being cut</li>
    </ul></div>
    <div class="card"><h3>Getting it written</h3><ul>
      <li>A template store with a preview of every template</li>
      <li>A free-form conversation that proposes a template and waits for yes</li>
      <li>Any single section rewritten, as often as you like</li>
      <li>The whole document rewritten, when the first pass missed the point</li>
      <li>Contradictions in your own note flagged to you, never to the reader</li>
      <li>Six drafts kept, so an interruption costs nothing</li>
    </ul></div>
    <div class="card"><h3>Making it yours</h3><ul>
      <li>An organisation model of people, clients, systems, products and terminology</li>
      <li>Names corrected to their proper spelling before the model reads the note</li>
      <li>New names offered for learning under the finished document</li>
      <li>A house style read from a PowerPoint or Word file your firm already uses</li>
      <li>Templates built in the admin space, exportable as a file</li>
      <li>A broadcast strip, editable without a deployment</li>
    </ul></div>
    <div class="card"><h3>Running it</h3><ul>
      <li>A shared passcode, and a classification line on every screen</li>
      <li>Cost and tokens measured per document, not estimated</li>
      <li>A local library, re-issuing any document with no further model call</li>
      <li>Anthropic first-party, Bedrock, Vertex or Foundry — one module, no silent fallback</li>
      <li>Works on a phone</li>
      <li>Endpoints callable without a browser, so a plugin is a wrapper, not a rewrite</li>
    </ul></div>
  </div>
</div></section>

<section><div class="wrap principles">
  <h2>What it refuses to do</h2>
  <p class="lede">Five decisions that are not preferences.</p>
  <div><h3>It invents nothing</h3>
    <p>No owner you did not name, no date you did not give, no consequence you did not
       state. A blank field is information. A plausible fabrication is a lie that gets
       circulated — and it is invisible, because the file still opens.</p></div>
  <div><h3>It never softens</h3>
    <p>If your note says a supplier has gone quiet and the date is gone, the document says
       so. Reports that read well and hide trouble are why nobody trusts reports.</p></div>
  <div><h3>It shows you the facts before it makes anything</h3>
    <p>Note, then fields, then <em>you fix them</em>, then the file. There is no button that
       generates a finished document from a note, because the work is in checking it.</p></div>
  <div><h3>It never drops something silently</h3>
    <p>A slide has an edge and a document does not. Content that will not fit continues on
       another slide, or the slide says how many rows were left off. A risk that was on
       your screen and is not in the file is how a risk nobody was told about reaches a
       document everybody signed.</p></div>
  <div><h3>It does not embellish a thin note</h3>
    <p>If you wrote three lines, you get three lines. That is the correct answer, and the
       reason the output can be sent without reading it twice.</p></div>
</div></section>

<section><div class="wrap">
  <h2>What it costs to run</h2>
  <p class="lede">Measured from the actual token counts of actual runs, not estimated.</p>
  <div class="cost">
    <div><b>~2p</b><span>a document, at current list prices</span></div>
    <div><b>~20s</b><span>from note to reviewable fields</span></div>
    <div><b>£0</b><span>to re-issue an existing document in another format</span></div>
    <div><b>0</b><span>servers to run — it deploys as a single web app</span></div>
  </div>
  <p style="margin-top:22px;color:var(--ink60);font-size:15px">Every run is recorded with its
     model, its token counts and its elapsed time, and the total is on the Usage screen.
     Nobody has to take the number on trust.</p>
</div></section>

<section class="door"><div class="wrap">
  <h2>Getting in</h2>
  <p class="lede">Virtus is an in-house tool, not a product for sale. There is no sign-up.</p>
  <div class="grid">
    <div class="card"><h3>Today</h3><ul>
      <li>One deployment, behind a shared passcode</li>
      <li>The classification line says what may be entered</li>
      <li>Everything a person makes stays on their own device</li>
    </ul></div>
    <div class="card"><h3>When it is adopted</h3><ul>
      <li>Company sign-in replaces the passcode — one function changes</li>
      <li>Every record already carries an owner, so nothing needs migrating</li>
      <li>A shared template library, and documents a team can see</li>
      <li>An MCP plugin over the endpoints that already exist</li>
    </ul></div>
  </div>
</div></section>

<footer><div class="wrap">
  {mark(18, ACCENT, NIGHT)}
  <span>Virtus {v}</span>
  <span>Built in-house. Not for sale.</span>
  <span style="margin-left:auto"><a href="{base}/about">{base.replace('https://', '')}/about</a></span>
</div></footer>
</body></html>"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=DEFAULT_BASE,
                    help='deployment URL, used for the video and the footer')
    args = ap.parse_args()

    html = build(args.base.rstrip('/'))
    for target in (ROOT / 'public' / 'about.html', ROOT / 'docs' / 'site.html'):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html)
    print(f'wrote {len(html) // 1024} KB to public/about.html and docs/site.html')
    print(f'base URL: {args.base}')


if __name__ == '__main__':
    main()
