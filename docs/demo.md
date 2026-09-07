# Running the demo

Five minutes, driven live. Written so you can read it once and not need it.

---

## Before the room

1. **Set the two environment variables in Vercel**, then **redeploy**. Vercel
   applies environment variables at build time, so a variable added after the
   last deployment has no effect until the next one — which is the usual reason
   a passcode appears to have been set and nothing asks for it.

   | Variable | Value | Scope |
   |---|---|---|
   | `VIRTUS_PASSCODE` | the shared code | Production **and** Preview |
   | `VIRTUS_CLASSIFICATION` | `Trial Run - Do not enter confidential data` | Production **and** Preview |

   Add them to every environment the URL will be opened in — a code set on
   Production only leaves preview URLs open. Then **Deployments → ⋯ → Redeploy**
   (leave "use existing build cache" unticked). Confirm in a private window:
   the app should send you to the unlock screen, and the classification line
   should read across the top of every page.
2. **Open the app once yourself** — the first request after a quiet period is
   slower while the function wakes. Do it in the corridor, not on the projector.
3. **Have `/organisation` populated** with four or five real names — a director,
   a client, a system, one acronym. This is what makes the difference visible.
4. **Have a real note ready to paste.** Yours, messy, about something they know.
   The clickable samples are a fallback, not the plan.
5. Know where `/case` is. You will be asked.

---

## The five minutes

### 1. Paste the note. Say nothing about AI. (30 seconds)

> "This is what I actually wrote after Thursday's call."

Let them read it. It should look like a mess, because it is one. **The mess is
the point** — everyone in the room has that note somewhere.

### 2. Pick *Weekly status report*. (20 seconds)

While it runs, say what it is doing: reading what you actually said, not
inventing a report. The screen shows elapsed seconds so the pause is expected
rather than worrying.

### 3. Stop at the fields screen. This is the product. (90 seconds)

Do not rush to the download. **The middle step is the whole argument.**

> "It hasn't made a document. It's made the *facts*, and I fix them before
> anything exists. Fixing a list takes a minute. Fixing a laid-out slide takes an
> afternoon."

Point at three things:

- **An empty box.** "It didn't invent an impact I never stated. That's the rule
  the whole thing is built on — an empty field is information."
- **The amber flag**, if one appeared. "It noticed my note contradicts itself.
  It's telling *me*, not my director."
- **A name it spelled right.** "It knows how we spell that, because I told it
  once."

### 4. Download. Open it in PowerPoint. (60 seconds)

Present the slide without editing it. That is the test.

Then — and this is the moment that usually lands — **download the same thing as
Word, and as a PDF.**

> "Same note. One structure. Whatever the reader needs."

### 5. Show the breadth, briefly. (30 seconds)

Go back and scroll the format list. Twenty-six of them. Don't demo a second one
unless asked — the point is that the list exists and the twenty-seventh is a
config entry, not a project.

### 6. `/case`. (60 seconds)

> "It measured itself. That's real time and real cost from the runs we just did."

Change the *people* dial to their team size in front of them.

Then read the amber box out loud. **Volunteering the limits is what makes the
rest credible** — a room that does this for a living is already composing those
objections.

---

## The questions you will get

**"Where does our data go?"**
`/api/where` says it, and the footer says it. Currently
`claude-opus-5 via anthropic`. If they push: this is the one open decision —
whether the firm's existing agreement (Bedrock, Azure, direct) should be used
instead. One module changes. Say that plainly; it is a better answer than a
vague reassurance.

**"Could it just make things up?"**
Yes, that is the risk, and it is the thing most engineered against. Show an
empty field again. The prompts name the fields most likely to tempt it. Two
hundred and forty-one automated tests, and the strongest asserts that nothing on
the output traces back to anywhere but the input.

**"What if Claude does this natively next year?"**
Good news, not a threat. Generation getting better is free improvement. What is
ours — what the organisation knows about itself — keeps its value whoever does
the writing. That is `/organisation`, and it is the actual asset.

**"Can my team use it?"**
Not yet as a team: one shared passcode, everything on the device. Sign-in and
shared libraries are a known next step, not a discovered problem. Say so rather
than implying it is ready.

**"How long did this take to build?"**
Two days. Be careful with this one — it is impressive and it also invites "so
finish it this week".

---

## What not to do

- **Do not demo more than two formats.** Breadth is a list, not a performance.
- **Do not skip the fields screen.** Without it this is a document generator,
  and they have seen those.
- **Do not claim minutes saved.** `/case` says the minutes-by-hand figure is
  theirs to set. Let them set it — a number they chose is one they believe.
- **Do not paste anything restricted.** The classification line is unset. Until
  it is answered, treat the demo as if it were public.
