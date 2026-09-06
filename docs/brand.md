# The house style

Virtus renders decks in the firm's own colours and typeface. This is what §3
means by *what comes out is already ours* — a generic model writes generic
documents, and the part that is ours is the part that keeps its value.

## Where these came from

Extracted from the firm's 2Q26 earnings presentation (36 pages), by reading the
colour operators out of the PDF's content streams and the embedded font names
out of its font table — rather than by eye, which would have guessed at the
near-identical greens.

Frequency is the evidence: the two greens below account for over 400 fills and
strokes across the deck, which is what makes them the house colours rather than
one chart's palette.

## The palette

| Token | Hex | What it is for |
|---|---|---|
| `accent` | `#0F7F40` | The house green. Chart bars, numerals, anything that carries the brand. |
| `accentLine` | `#008555` | The second green. Rules under headings, the mark on a title slide. |
| `accentSoft` | `#CCE6DD` | Highlight panel — the firm's own tint, at its own strength. |
| `accentSofter` | `#EAF5F0` | A full-bleed panel. `accentSoft` across a whole slide is too heavy to read dark text on. |
| `ink` | `#1A1A1A` | Body text. |
| `muted` | `#6D6D6D` | Axis labels, footers, anything secondary. |
| `rule` | `#DBDBDB` | Dividers and gridlines. |
| `ruleSoft` | `#EAEAEA` | Table banding. |

**Chart series**, in the firm's own order: `#0F7F40` green, `#00497F` deep blue,
`#FBC150` amber, `#EE2724` red for a negative, `#008555` green again. Only the
first is used today because the renderer draws one series, but the order is
theirs and should be kept when more arrive.

## The typeface

**Trebuchet MS**, embedded in the firm's deck in all four cuts (regular, bold,
italic, bold italic). There is no light cut, so headings are separated from body
text by size and colour rather than weight — which is why `faceHeading` and
`face` are the same string.

It is set as the deck's *theme* font as well as on every text box Virtus writes.
That matters because a deck is meant to be edited by hand afterwards: a text box
the person adds themselves inherits the theme font, and left at the library's
default it would come out Calibri on an otherwise Trebuchet deck.

(`docProps/app.xml` still lists Calibri in its fonts-used metadata. That is a
hardcoded list inside pptxgenjs, applied to nothing, and PowerPoint rewrites it
on save.)

## Changing any of this

`lib/deck/master.ts` is the only place these live. Change a colour there and
every slide, in every shape, follows. `tailwind.config.ts` carries the same
accent so the app and the decks it makes look related — keep the two in step.

Reading the firm's actual `.potx` is a project of its own and deliberately not
day-one work (§6). This gets the decks close enough to pass without a second
glance, which is what the first person to use it will judge.
