# Virtus — internal test report

**Run:** 7 September 2026 · version 0.9.0 · commit on `claude/virtus-vyloeq`
**Ran by:** Claude, unattended, against the local build and a running server.

This records what was tested, what passed, and — more usefully — what was **not**
tested and what could still go wrong in front of an audience.

---

## Summary

| | |
|---|---|
| Automated tests | **177 passed, 0 failed** (6 files, 1.4s) |
| HTTP integration checks | **9 passed, 0 failed** |
| Passcode gate checks | **7 passed, 0 failed** |
| Typecheck / lint / build | clean; lint runs at zero warnings |
| Formats | 24 — 17 render as slides, 24 as Word, 17 as both |
| Application code | ~5,050 lines |
| Test code | ~560 lines |

**Nothing is failing.** The material risks are all in the untested column below.

---

## 1. What the automated tests cover

They deliberately cover **one thing per area**: the rule that, if it broke,
would fail silently and reach a client.

### 1.1 Nothing invented (77 tests across 24 formats)

Every format is driven end to end — schema, prompt, both renderers — with an
**empty** document and a **filled** one.

- An empty document still draws every section. An empty risk table is a
  statement ("nothing raised"); dropping the section turns that statement into
  an absence nobody notices.
- A filled document contains **nothing that was not supplied**. The strongest
  test collects every text run on the rendered slide and asserts each one is
  either the format's own furniture or something the input gave it. That catches
  an invented value of *any* shape, rather than one anticipated mutation.
- Contradictions flagged to the author (`reconcile`) never reach a slide or a
  document.

### 1.2 Shape degradation (7 tests)

A chart asked for without real figures becomes bullets. A two-column slide with
no separator becomes bullets, and is asserted **identical** to a real bullets
slide rather than merely containing the same words.

### 1.3 The organisation model (11 tests)

Name correction only fires on capitalised near-misses; two equally close names
means neither wins. Unknown-name detection ranks by frequency and ignores days,
months and the words every status note capitalises.

### 1.4 Failure messages (4 tests)

Asserted as **properties**, not strings: never the word "error", never a status
code, never a fragment, and a Try again button only where retrying could help.

### 1.5 Cost (5 tests)

Arithmetic pinned, and the refusal to guess pinned harder — an unpriced model
returns nothing rather than a number.

### 1.6 The passcode gate (4 tests)

Same code gives the same token (a cookie survives a redeploy); a different code
gives a different token (changing it signs everyone out); the token never
contains the code; comparison does not short-circuit.

---

## 2. Mutation testing

A passing test proves nothing until it has been made to fail. Each guard was
broken on purpose and the suite re-run.

| Guard broken | Caught |
|---|---|
| Treat a figure-less chart line as zero | ✅ 2 tests |
| Allow a one-bar chart | ✅ 1 test |
| Drop the two-column fallback | ✅ after tightening — see below |
| Fill a blank risk cell with "TBC" | ✅ after tightening — see below |
| Drop the risk table when empty | ✅ |
| Print author-only doubts onto the slide | ✅ |

**Two tests failed to catch their mutation on the first attempt**, and both are
worth recording because the tests looked fine:

1. The two-column fallback was asserted on visible text alone. A broken fallback
   still shows the same words, just laid out wrongly. Fixed by rendering the
   same content as a real bullets slide and asserting the two are identical.
2. The blank-cell test counted em-dashes. Filling risk cells with "TBC" passed
   it, because dashes elsewhere on the slide satisfied the count. Fixed by the
   general "nothing that was not supplied" assertion.

The renderer was byte-identical after every mutation was reverted.

---

## 3. HTTP integration checks

Run against a production build on a live server.

| Check | Result |
|---|---|
| Weekly status renders as a slide (correct MIME, >50 KB) | pass |
| Weekly status renders as Word (correct MIME, >5 KB) | pass |
| Unknown format id | 404 |
| Malformed document | 400 |
| Missing sections | 400, not a crash |
| Empty note | 400 |
| Note over 60,000 characters | 413 |
| Format list served | 200 |
| **No format returns a server crash on any output** | pass |

## 4. Passcode gate, over HTTP

| Check | Result |
|---|---|
| Unset passcode | no gate at all (fail open, lesson 12.10) |
| Set passcode, no cookie → page | 307 to `/unlock` |
| Set passcode, no cookie → API | 307 — the API is behind the gate too |
| Unlock screen itself | 200 (never gated, or nobody could get in) |
| Wrong code | 401 |
| Right code | 200, sets cookie |
| With cookie | 200 on both page and API |
| Passcode present anywhere in the cookie | **no** — it is an HMAC |
| Cookie flags | HttpOnly set |

---

## 5. What was NOT tested, and why

This is the section that matters before a demo.

### 5.1 The model calls — never exercised

**No environment available to me has had an API key.** `/api/format/[id]`,
`/api/structure` and `/api/outline` have never been run against the live API by
these tests. Everything downstream of them is proven; the calls themselves are
proven only by the one manual run you did yesterday on the weekly status format.

**What this means in practice:** the other 23 formats have never had a real note
through them. The schema, prompt and rendering are all tested, so a failure
would most likely be *quality* — a section the model fills thinly or misreads —
rather than a crash.

**Recommended before the demo:** run one real note through three or four
formats, ideally including a Word one. Fifteen minutes.

### 5.2 Not tested on purpose

- **Anything that calls the model in CI.** Different answer every run, real
  money, and flaky. A test that fails randomly gets ignored, and then hides the
  one failure that mattered.
- **Visual layout.** Asserting positions or hex values breaks on every
  deliberate design change, which trains people to ignore red.
- **Browser behaviour.** No end-to-end browser test exists. Draft saving,
  IndexedDB and the offline path are covered by reasoning and manual use, not by
  automation.

---

## 6. Known risks for a live demo

Ranked by how likely they are to be visible.

1. **Speed is unmeasured.** Nothing here has timed a real model call. Opus on a
   long note may take 15–25 seconds. The waiting state is built for that — it
   shows elapsed seconds and says "long notes take longer" past fifteen — but if
   it is slower than you want, `VIRTUS_MODEL_STRUCTURE=claude-sonnet-5` is the
   dial, and it is the extraction pass so quality loss is smallest there.
2. **Vercel function timeout.** The route declares 60 seconds. A very long note
   on a slow day could hit it. The client gives up at 90 and says something
   sensible. Keep demo notes under roughly 500 words.
3. **Quality on the 23 untried formats.** See 5.1.
4. **Trebuchet MS** must be installed on the machine opening the file. It is
   standard on Windows and Office for Mac; a Linux box or Google Slides will
   substitute and the deck will look slightly different.
5. **The classification line is still unset.** The footer and `/api/where`
   currently say *"Not yet set — ask before using real client material."* If a
   security-minded person is in the room, that sentence is either a good answer
   or an awkward one depending on how it is framed.

---

## 7. What I would fix next, in order

1. Run a real note through several formats and correct the prompts from what
   comes back. This is the highest-value hour available and needs a key.
2. Measure real end-to-end time and decide the model question with evidence.
3. A browser test over the whole path — type, choose, edit, download — because
   every automated test here stops at the HTTP boundary.
4. Answer §5: where is the text allowed to go, and set `VIRTUS_CLASSIFICATION`.
