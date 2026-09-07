# Raw notes for testing

Twenty-six notes, one per template. Paste one in, pick the matching template,
and see what comes out.

They are written the way people actually write: fragments, half sentences,
numbers without units, two things in one line, a thing nobody decided. **That is
the test.** A clean note proves nothing — the product's whole claim is that it
copes with the note you really made, and that it does not tidy a gap into a
fact. If a note below is vague about something, the document should be vague
about it too.

Everything here is invented. One fictional firm runs through all of them, so the
organisation model has something to learn:

| | |
|---|---|
| **Firm** | Meridian Financial Services |
| **Programme** | Atlas — replacing the core platform |
| **People** | Priya Raman (delivery lead), Tom Alderton (CTO), Deepa Nair (security), Marcus Webb (vendor management), Sofia Ellis (product owner), Ken Osei (SRE lead), Rachel Lim (test manager), Javier Costa (finance) |
| **Systems** | ATLAS (new core), LEDGERLINE (legacy general ledger), Harbour (customer portal), Sentinel (monitoring) |
| **Suppliers** | Kestrel Cloud, Northgate Systems, Bluefin Support |

> Two of these notes contradict themselves and one names a decision nobody
> actually made. They are meant to. Watch what the document does with them.

---

## Project & delivery

### 1 · Weekly status report — `weekly-status`

```
atlas week 34. amber I think. still amber.

migration dry run went ok on saturday, 4hrs 20 vs the 6 we planned which is good
news. 2 accounts didn't reconcile, ken looking, probably the fx rounding thing
again. dev env still on the old build, nobody's had time.

blocker is still northgate. we asked for the api spec 3 weeks ago, marcus
chased twice, they say "next week" every week. if we don't have it by the 19th
the october window is gone and we're into january because of the freeze.

priya out from the 12th - 2 weeks. sofia covering standups.

budget - javier says we're 40k over on contractors but under on licences so net
roughly fine? need to actually check that.

3 stories carried over again. same 3.
```

### 2 · RAID log — `raid`

```
things keeping me up, atlas.

northgate api spec not delivered. this is the big one. slips the whole october
window. marcus owns, no date.
ken is the only person who understands the reconciliation logic. if he's ill
we stop. we've said we'd cross train for 6 months.
we are assuming ledgerline stays available until march. nobody has confirmed
that with the ledgerline team, we've just been saying it.
also assuming kestrel capacity is there for the cutover weekend - not booked.
deepa raised the pen test finding, the one on session handling. not fixed, not
formally accepted either, it's just sitting there.
dependency on the payments team for the new sort code file. they know. they
have not committed to a date.
laptop refresh in november takes half the team out for a day each, nobody
factored that in.
```

### 3 · Project charter — `project-charter`

```
kickoff notes, atlas phase 2.

why: ledgerline is 19 years old, the vendor drops support march next year, and
we can't hire anyone who'll touch it. two people left last year over it.

what we're doing: move core ledger + reporting onto atlas. not the customer
facing stuff, harbour stays where it is for now, that's phase 3 and we should
say that loudly because everyone assumes it's in scope.

tom is sponsor. priya running it. sofia owns the product side.
finance, ops and the payments team all have to give people. finance have said
yes properly, the other two have said yes in a meeting which is not the same
thing.

done looks like: ledgerline switched off, month end runs on atlas twice
cleanly, no manual journals.

money - somewhere around 2.4m, that's the number in the plan, i don't think
it's been re-run since january.
```

### 4 · Cutover plan — `migration-cutover`

```
cutover weekend, draft. friday 17th oct evening through monday am.

fri 6pm - comms out, ken puts the banner up on harbour
fri 7pm - last ledgerline batch, then we lock it. read only. ken + one from ops.
fri 9pm-ish - extract starts. this is the long pole, 5-6 hrs based on the dry
run, so done by 3am hopefully
sat early - load into atlas, ken and the northgate engineer (need to confirm
they're actually giving us one)
sat afternoon - reconciliation. rachel's team. this is the go/no-go, if the
control totals don't match to the penny we roll back
sat 6pm - GO or NO GO. tom decides. needs to be tom, not a committee.
sun - smoke tests, finance do a mock month end
mon 7am - open up

rollback is restore ledgerline from the friday snapshot and unlock it. we've
never actually tested that. we should. probably won't have time.
```

### 5 · Sprint review — `sprint-review`

```
sprint 23 review.

shipped: the new journal entry screen, bulk upload, and the audit trail thing
finance asked for. also fixed the timezone bug that's been annoying everyone.

didn't ship: reporting export. blocked on the northgate spec, same as always.
carried to 24.
also didn't ship the reconciliation dashboard, we started it wednesday and it
turned out to be much bigger than the 5 points we put on it. probably 13.

velocity 31, was 38 and 34 before that. two people were on the security
training thing for two days.

sofia liked the bulk upload. finance want a confirmation step on it before it
goes live, fair point, nobody had thought about someone uploading the wrong
file.

what we learned: we keep sizing anything with "dashboard" in it wrong.
```

### 6 · Budget status — `budget-status`

```
atlas money, end of aug.

approved 2.4m. spent to date 1.62m. so 68%.
we're 7 months into a 10 month plan so that's roughly where it should be,
except the last 3 months are the expensive ones.

contractors are over. 40k. we brought the two northgate people on earlier than
planned because of the spec delay which is a bit ironic.
licences under by about 55k, kestrel gave us the committed use discount.
hardware is done, nothing more coming.
we haven't spent anything on the contingency. 180k sitting there.

forecast to complete - javier says 2.51m, so 110k over. that's within the
contingency but only just, and that assumes no january slip. if we slip to
january add 3 months of the core team, call it another 200k, and then we're
having a different conversation.

nobody has told tom the 2.51 number yet.
```

### 7 · Retrospective — `retrospective`

```
atlas retro, whole team, 90 mins.

good: the dry run. everyone said it. it was the first time it felt real and
people came in on a saturday without being asked.
pairing on the reconciliation code helped, ken said he's less of a single point
of failure than he was.
the new environment is much faster.

bad: standups are 40 minutes. every day.
we found out about the laptop refresh from an all staff email. that's the third
thing this quarter we found out that way.
nobody knows what "done" means on a story. three people said this separately.
too many meetings where nothing is decided, then the decision happens in a
corridor and half the team doesn't know.
the northgate thing has been "chased" for 3 weeks and nothing changed. chasing
isn't a plan.

actions - we said we'd fix standups last retro too.
```

---

## Operations

### 8 · Incident postmortem — `incident-postmortem`

```
INC-4471. harbour down. tuesday.

09:12 first alerts, sentinel. 5xx on the login path.
09:14 ken sees it, escalates
09:20 we think it's the load balancer, spend 25 mins there. it wasn't.
09:48 someone notices the connection pool is exhausted on the atlas side
09:55 restart the pool, service comes back for ~4 mins then goes again
10:20 identify the actual cause - a report someone kicked off manually was
holding connections open, no timeout on it
10:24 kill the report, service stable
10:40 declared resolved

so 88 minutes hard down, roughly 12000 customers couldn't log in, 340 support
calls. one complaint went to the ombudsman apparently.

root cause is the report has no query timeout. it's had no timeout since it was
written in 2021.
what made it worse: we had no alert on pool utilisation so we were guessing for
35 minutes. and the runbook for harbour points at the old dashboard.
```

### 9 · Change request — `change-request`

```
change - need to bump the atlas connection pool from 50 to 200 and put a 30s
timeout on the reporting queries. also adding a sentinel alert at 80% pool.

this is off the back of INC-4471 last week.

risk is low-ish. pool size change needs a restart of the app tier, 2 mins,
we'd do it in the sunday window. the timeout could in theory kill a legitimate
long report - finance have one that runs 4 minutes at month end so 30s is fine
for everything except possibly the year end one which nobody has timed.

back out is set it back to 50 and remove the timeout, it's config, 2 minutes.

tested in staging thursday. staging is smaller than prod so the pool numbers
don't really prove anything, they just prove it doesn't break.

wants to go sunday 14th. ken doing it, deepa's aware, need cab.
```

### 10 · Release notes — `release-notes`

```
atlas 4.2 going out thursday.

new - bulk journal upload, finance have been asking for 2 years. csv, up to
5000 rows, with a confirm step before it commits.
new - audit trail on every journal, who and when, exportable.
changed - the journal entry screen has been rebuilt, it's the same fields but
the tab order actually works now and it's about 3x faster on a full page.
fixed - timezone bug where anything entered after 11pm got yesterday's date.
this has been there since 3.9 and we think it affected about 200 entries which
finance are correcting manually.
fixed - the search on the reconciliation screen was case sensitive, it isn't
now.

known - reporting export still isn't there. it's the thing everyone asks about.
no date.
the bulk upload doesn't handle multi currency yet, single currency only, if you
put mixed currencies in it rejects the whole file.
```

### 11 · Service review — `service-review`

```
monthly service review with bluefin. august.

availability 99.71 against 99.9 target. that's the harbour incident, INC-4471,
88 mins. without it we'd have been 99.98.
p1s: 1 (that one). p2s: 4. p3s: 31.
mean time to restore on the p2s was 6.5 hrs against a 4 hr target. three of the
four breached.

the pattern in the p2s is all four were database related and all four went to
ken. that's a resourcing thing on our side not theirs.

bluefin missed the response sla twice, both overnight, both times it was 40 mins
against 15. they've said it's a rota gap and they've fixed it. they said that in
june as well.

tickets aged over 30 days: 14. was 9 last month. going the wrong way.

we owe them the updated runbook for harbour. we've owed it since june.
```

### 12 · Capacity report — `capacity-report`

```
capacity, kestrel estate, q3.

cpu average 41% across the atlas nodes, peaks to 78% at month end for about 6
hours. headroom is fine.
memory is the one to watch, sitting at 71% baseline and it was 62% in may. it's
crept up every month since we turned on the audit trail. at this rate we're at
85 by christmas.
storage 34TB of 50. growing 1.4TB a month, mostly audit logs which we keep for
7 years because compliance say so. that gets us to march before we need more.
database connections - see the incident, we've bumped the pool.

cutover weekend is the thing nobody's sized. we'll be running ledgerline and
atlas in parallel plus the extract. i don't know if we have the headroom for
that and i don't think anyone's asked kestrel.

cost is 47k/month, was 52 before the discount.
```

### 13 · Vendor review — `vendor-review`

```
northgate. quarterly review, and honestly it needs to be a different
conversation than the usual one.

contract is 340k a year, renews january, 2 years in.

what's good - their platform works. genuinely. uptime has been fine, the
product does what the demo said it did.

what's not - the api spec. 3 weeks late, no date, and every time we chase we
get "next week". this is now the single biggest risk on atlas and it's
entirely theirs.
their account manager changed in june and the new one hasn't been to a review.
we raised 6 support tickets last quarter, 2 are still open, one since may.
they missed the q2 roadmap commitment on the reporting api.

what we want - a named date for the spec in writing, an escalation path that
isn't the account manager, and the may ticket closed.

renewal leverage: january. use it.
```

### 14 · Security posture — `security-posture`

```
security position, atlas, for tom.

pen test in july. 2 highs, 6 mediums, 11 lows.
both highs are fixed - the auth bypass on the admin endpoint and the sql thing
in the search. retested, clean.
mediums - 4 fixed. the session handling one is not fixed, it's the one where the
session doesn't invalidate server side on logout. deepa says it's a real issue.
it's been open since july and it hasn't been formally accepted either, it's just
open. that's the worst state to be in.
the other outstanding medium is the tls config on the internal endpoint, low
practical risk, we know.

patching - 94% of servers within sla. the 6% is the three ledgerline boxes
which we can't patch because the vendor won't support it. compensating control
is they're network isolated. that's been signed off.

no incidents with data involved this quarter. one phishing click, no
credentials entered, caught by the proxy.

mfa on everything except the ledgerline admin console. old, doesn't support it.
```

### 15 · Runbook — `runbook`

```
harbour login failures - what to do. writing this down because of INC-4471 and
because the old runbook points at a dashboard that doesn't exist.

symptom: 5xx on /login, sentinel alerts "harbour-web 5xx rate", support start
getting calls within about 5 minutes.

first thing - check pool utilisation, sentinel dashboard "atlas-db-pool". if
it's at or near max that's your answer, don't go near the load balancer, we
wasted 25 minutes there.

if pool is maxed: find what's holding connections. query is in the wiki, the
long running sessions one. usually it's a manual report. kill the session. do
not restart the app tier first, it comes back for 4 minutes and then dies again
and you've lost time.

if pool is fine: then check the LB, then the app logs.

escalate to ken if not resolved in 20 mins. out of hours it's bluefin first,
15 min response, they can kill sessions but not restart.

comms - banner on harbour goes up at 15 mins, support get told immediately.
```

---

## Engineering

### 16 · Architecture decision record — `adr`

```
decision on how atlas talks to the payments team's service.

we've been going round this for weeks. options were: direct db reads (they
offered, it's what the old integration does), a nightly file drop, or their rest
api which exists but is undocumented.

going with the api. reasons - db reads couple us to their schema and they're
replatforming next year, we'd break. file drop means we're always a day behind
and finance need same day for the reconciliation.

what it costs us: their api does about 40 requests a second and we need bursts
of maybe 200 at month end. so we need caching on our side and we need to talk
to them about rate limits. also it's undocumented so we're reverse engineering
from their staging environment which is not a great place to be.

we're accepting that we'll be doing integration work we can't fully scope until
we've seen the responses.

tom, priya, ken, and someone from payments whose name i didn't get. tuesday.
```

### 17 · Technical design — `technical-design`

```
reconciliation service, design notes.

problem - at cutover and then every month end we need to prove ledgerline and
atlas agree, to the penny, across about 4m journal lines. right now it's a
spreadsheet and ken.

shape: a service that pulls control totals from both sides, compares by account
and period, and writes a diff. runs on demand and on a schedule.

reads from ledgerline via the existing extract (we are NOT writing anything back
to ledgerline, ever). reads atlas via the internal api. writes results to its
own store, small, we only keep the diffs.

the hard part is fx. ledgerline rounds at the transaction, atlas rounds at the
batch. so they will never match exactly on multi currency accounts and we need a
tolerance. what tolerance is a finance decision not an engineering one and it
hasn't been made.

4m lines in the comparison window. needs to finish in under 2 hours to fit the
cutover. current spreadsheet approach takes ken a day and a half.

not doing: automatic correction. it reports, humans decide.
```

### 18 · RFC — `rfc`

```
proposing we stop building environments by hand.

right now: 4 environments, all built by different people at different times,
all slightly different. staging has a smaller pool than prod which is why the
INC-4471 change didn't really get tested. dev is on a build from june. it takes
about 3 days to stand up a new one and only ken and one other person can do it.

proposing terraform, everything in the repo, environments built from the same
code with a size variable.

what it costs: about 3 weeks of someone's time to do it properly, and it lands
in the middle of the cutover run up which is bad timing. and we'd have to
rebuild staging which means a week where staging is unreliable.

alternative is do it after cutover in november. safer, but we go into the
biggest change of the year with environments we can't trust.

i think we do a cut down version now - just staging, matched to prod sizes - and
the full thing in november. want views.
```

### 19 · Handover — `handover`

```
ken's handover, he's off for 2 weeks from the 12th and this is the stuff only
he knows.

reconciliation logic - the fx rounding rules are in his head and in comments in
the code. the tolerance thing hasn't been decided so he's been eyeballing it.
he says anything under about 40p per account is the rounding, anything over is
real. that is not written down anywhere official.

the extract job - runs from a cron on the old jump box, not in the scheduler
like everything else, because the scheduler can't reach ledgerline. if it fails
it does not alert. he checks it every morning. somebody needs to check it every
morning.

kestrel console - he's the only one with the billing role.
the long running sessions query is in the wiki but the link in the runbook is
wrong.

open with northgate: ticket 8841, since may, about the batch ids. he's the only
one who's spoken to them about it.

who covers what: sofia takes the standups, the extract check needs an owner and
doesn't have one yet.
```

---

## Requirements & testing

### 20 · User story — `user-story`

```
finance want to be able to undo a bulk upload.

sofia's words - "if someone uploads the wrong file at 4pm on the last day of the
month, right now the only fix is 5000 manual reversals and that is a whole day
of someone's life."

so: as a finance user i want to reverse a bulk upload in one action so a wrong
file doesn't cost a day.

how we'd know it works - upload a file, reverse it, the ledger is exactly where
it was before. reversal is itself audited, you can see who did it and when.
can't reverse something that's been included in a closed period. can't reverse
twice. and there's a confirm step because this is destructive.

open question nobody's answered - can you reverse a batch that's been partially
adjusted afterwards? finance said "that shouldn't happen" which is not the same
as no.

sizing - team said 8, ken said 8 is optimistic given the audit trail bit.
```

### 21 · Epic brief — `epic-brief`

```
reporting. the whole thing. this is the epic everyone asks about and it keeps
getting pushed.

the problem: finance run 14 reports at month end. 11 of them come out of
ledgerline. when ledgerline goes off in march those 11 have nowhere to come
from. that's not a nice to have, month end stops.

what's in it: the 11 reports rebuilt on atlas, an export that produces the same
file format the downstream tools expect (this matters more than it sounds, three
other teams parse those files), and self service so finance can change a date
range without raising a ticket.

what's not in it: new reports. anything for the harbour side. anything for
regulatory reporting, that's a separate programme.

blocked on the northgate api spec, which is blocked on northgate.

rough size - 3 sprints if the spec turns up tomorrow. it will not turn up
tomorrow.

value is basically "month end continues to happen", which is hard to put a
number on and easy to underestimate.
```

### 22 · Business requirements — `brd`

```
requirements, reconciliation and reporting for atlas. gathered over 4 sessions
with finance, ops, and one with the payments team.

business context - ledgerline support ends march. 11 month end reports and the
whole reconciliation process depend on it.

what finance need: control totals matching between systems by account and
period, to a tolerance they define (they have not defined it). the 11 reports,
in the same output format because three downstream systems parse them. audit
trail on everything, 7 year retention, compliance requirement.
what ops need: the extract to be scheduled and alerting, not a cron on a jump
box that one person checks.
what payments need: nothing from us, but we need same day data from them.

out of scope: harbour, regulatory reporting, any new report.

constraints - march deadline is hard, it's a vendor support date. 4m journal
lines. the tolerance decision is outstanding and blocks the reconciliation
design.

sign off from javier for finance, ken for ops. payments haven't been asked
formally.
```

### 23 · Test plan — `test-plan`

```
test approach for atlas cutover. rachel.

what we're testing - the extract, the load, reconciliation to the penny, month
end running on atlas, and rollback. rollback is the one everyone forgets.

not testing - harbour, it's not changing. not doing a full regression on
ledgerline, it's being switched off.

environments - staging, which is smaller than prod, so anything about
performance we cannot prove until the dry run on real infrastructure. that's a
known gap, it's why we do dry runs.

data - we want a full production copy for the dry run. deepa needs to approve
that, it's real customer data, hasn't been approved yet. if it's not approved we
test on a 10% sample and the timings mean nothing.

entry criteria - 4.2 in staging, extract job stable for 5 consecutive nights.
exit - two clean reconciliations, one mock month end signed by finance,
rollback executed successfully at least once.

3 people for 4 weeks. we have 2.
```

### 24 · UAT sign-off — `uat-signoff`

```
uat for 4.2. two weeks, finance did it, 6 people.

47 test cases. 41 passed. 4 failed and were fixed and retested. 2 still open.

the 2 open ones: the bulk upload rejects a file if any row has a mixed currency,
which is correct behaviour but the error message just says "invalid file" and
doesn't say which row. finance say that's usable but annoying. the other is the
audit export takes 90 seconds for a full month which they say is "fine but feels
broken" because there's no progress indicator.

both agreed as low, both going into the backlog, neither blocks.

javier signed on behalf of finance on the 29th. verbally in the meeting, the
form is with him, he hasn't sent it back.

one thing that came up that isn't a defect - two people asked why they can't
reverse an upload. that's the story sofia raised. it's not in scope for 4.2 and
they know that but it came up every session.
```

---

## Governance packs

### 25 · Steering committee pack — `steerco`

```
steerco, thursday, for tom and the exec.

overall amber. was amber last month. the reason is the same reason.

where we are - dry run done and it beat the time estimate, 4hr20 against 6.
4.2 released, uat signed, finance happy with it. 68% of budget spent at 70% of
elapsed time.

the one thing i need them to hear - northgate have not delivered the api spec,
it is 3 weeks late, and if it isn't with us by the 19th we lose the october
window and go to january because of the year end freeze. january costs roughly
200k in team time and pushes us within 8 weeks of the ledgerline support
deadline. that is the whole meeting.

what i want from them - tom to escalate to northgate at exec level. we've
chased at working level three times and it hasn't moved.
also need a decision on the fx tolerance from finance, it's blocking design.

risks: single point of failure on ken. security finding open and unaccepted.
rollback never tested.

forecast 2.51m against 2.4m approved, inside contingency.
```

### 26 · Programme review pack — `programme-review`

```
half year programme review, atlas. this is the deep one, 90 mins, all
workstreams.

started january, 10 months, we're 7 in.
delivery - phase 1 done and live, phase 2 is where we are, phase 3 (harbour)
untouched and unfunded.
scope has been stable which is rare and worth saying. one thing added - the
audit trail, because compliance, and it cost us memory headroom we didn't plan
for.

workstreams:
build - on track, 4.2 out, velocity dipped but explained
migration - dry run good, cutover planned, rollback untested
integration - blocked, northgate
test - underresourced, 2 people where we need 3, and the prod data copy isn't
approved
security - 2 highs closed, 1 medium open and drifting

money 1.62 of 2.4 spent, forecast 2.51.

people - team of 14, 3 contractors, ken is a single point of failure and we've
said we'd fix that for 6 months and haven't.

benefits - the case said 400k a year in support costs after ledgerline goes.
nobody has revisited that number since january and i suspect it's optimistic
because we're keeping the ledgerline boxes for the 7 year retention.

what needs deciding today: fx tolerance, phase 3 funding, and whether we're
still going in october or planning for january.
```
