/**
 * Notes to try, for the moment nobody wants to type.
 *
 * Written the way a real one arrives — out of order, half-punctuated, with the
 * important thing last and a couple of things that do not quite add up, because
 * a sample that is already tidy demonstrates nothing.
 */
export interface Sample {
  label: string;
  suggests: string;
  note: string;
}

export const SAMPLES: Sample[] = [
  {
    label: 'A week on a migration',
    suggests: 'weekly-status',
    note: `ledger migration week ending friday. wave 1 went over the weekend, no rollback needed, 34 of 52 interfaces migrated and reconciled. still losing about two days a week because payments and ledger both deploy to PRE-2 and each deploy kills the other team's test run. asked priya for a second pre-prod environment on the 12th, still waiting, expect an answer by 19 sep. tom found twelve interfaces nobody had documented, owners assigned now, discovery runs to end of september. storage vendor hasn't replied in three weeks, anita has escalated to the account director. we are not making the december date unless the environment lands. next week: wave 2 dry run, extend the reconciliation window to 72 hours and retest.`,
  },
  {
    label: 'An outage',
    suggests: 'incident-postmortem',
    note: `payments api was down 09:14 to 10:47 tuesday. sev 1. customers couldn't check out, about 40 minutes of that was full outage the rest was degraded. started when the connection pool config went out with the 09:10 deploy — max connections dropped from 200 to 20, someone had been testing locally and it got committed. we didn't spot it until customer support called at 09:31, monitoring didn't alert because the health check only hits one endpoint and that one was fine. rolled back at 10:40, recovered by 10:47. actions: health check needs to cover the checkout path (raj, end of month), config values for pool sizes should come from environment not the repo (nadia, next sprint), and we need an alert on connection pool exhaustion. root cause is really that we have no review on config-only changes.`,
  },
  {
    label: 'A decision nobody wrote down',
    suggests: 'adr',
    note: `we decided on postgres for the event store in the end. meeting was me, sam, and dee on the 3rd. we looked at kafka, which everyone wanted, and dynamodb. kafka is the right answer technically for throughput but we'd be the only team running it and ops said flat no to another platform this year. dynamo would work but the query patterns we need mean we'd be building indexes by hand and we've been burned by that on the catalogue service. postgres gets us transactional writes with the rest of the data, we already run it, and at our volume — maybe 400 events a second at peak — it's fine. the cost is we'll have to revisit if we ever go past about 5k a second, and we're taking on a partitioning job we'd rather not have. sam is writing up the partitioning approach next week.`,
  },
  {
    label: 'A sprint that half worked',
    suggests: 'sprint-review',
    note: `sprint 24 finished friday, team atlas, 2 weeks. goal was get the new onboarding flow behind a flag in staging — we got it there but only just, thursday night. committed 34 points did 26. done: the flow itself, the email templates, the audit logging. carried over: the analytics events, which turned out to need a schema change nobody had costed, and the welsh translations because the vendor hasn't come back. retro said we keep committing to things that depend on other people and then being surprised. also standups have crept to 25 minutes. actions — priya to timebox standup properly, and we agreed anything with an external dependency gets flagged at planning not discovered mid sprint.`,
  },
];
