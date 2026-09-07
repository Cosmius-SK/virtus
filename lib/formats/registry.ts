import type { Column, Field, FormatDef, Section } from './types';

/**
 * The formats Virtus knows.
 *
 * Every one of these is a document somebody in an IT function writes by hand,
 * on a Friday, from notes they already have. That is the whole thesis: the
 * mundane half of the job, taken off them.
 *
 * Adding one is adding an entry here. No renderer, no prompt, no screen — which
 * is what makes an admin page a small job later rather than a rewrite.
 */

const para = (id: string, label: string, hint: string, height = 0.5): Section => ({
  id,
  label,
  kind: 'paragraph',
  hint,
  height,
});

const list = (id: string, label: string, hint: string, height = 0.7, max = 5): Section => ({
  id,
  label,
  kind: 'list',
  hint,
  height,
  max,
});

const pair = (a: Section, b: Section): Section[] => [{ ...a, beside: true }, b];

const table = (
  id: string,
  label: string,
  hint: string,
  columns: Column[],
  height = 0.8,
  max = 4,
): Section => ({ id, label, kind: 'table', hint, height, max, columns });

const fields = (fieldList: Field[]): Section => ({
  id: 'header',
  label: 'Header',
  kind: 'fields',
  hint: 'The identifying details across the top. Only what the note gives.',
  height: 0.24,
  fields: fieldList,
});

const col = (id: string, label: string, hint: string, width: number): Column => ({
  id,
  label,
  hint,
  width,
});

const f = (id: string, label: string, hint: string, width = 1): Field => ({ id, label, hint, width });

/** Columns that recur across half the formats in the building. */
const OWNER = col('owner', 'Owner', 'Who owns it, as named. Empty if not named.', 0.9);
const DUE = col('due', 'Due', 'A date alone, as written. "by 10-Sep" is "10-Sep". Empty if none.', 0.8);
const RAISED = col('raised', 'Raised', 'A date alone, as written. Empty if not given.', 0.8);
const IMPACT = col(
  'impact',
  'Impact',
  'ONLY if the note states a consequence. Do not reason one out — "approvals are pending" does not tell you what happens if they do not arrive. This is the field most likely to tempt you.',
  1.9,
);
const MITIGATION = col('mitigation', 'Mitigation', 'The plan, if the note gives one. Empty otherwise.', 2.2);

export const FORMATS: FormatDef[] = [
  {
    id: 'weekly-status',
    name: 'Weekly status report',
    description: 'A project status one-pager — where it stands, what moved, what is in the way.',
    audience: 'a director who reads nothing else about this project all week',
    status: true,
    sections: [
      fields([
        f('projectId', 'Project ID', 'Project id if given, else NA.', 1.2),
        f('projectName', 'Project Name', 'Project name if given, else empty.', 2.6),
        f('startDate', 'Start Date', 'Start date as written, else empty.', 1.3),
        f('endDate', 'End Date', 'End date as written, else empty.', 1.3),
      ]),
      para('summary', 'Executive Summary', 'Two or three sentences. The position, not the activity.', 0.5),
      list('decisions', 'Key Decisions', 'Decisions taken, or decisions the note says are needed. Not tasks.', 0.66),
      ...pair(
        list('done', 'Key Accomplishments', 'What actually moved. Completed things, not started things.', 0.72),
        list('next', 'Upcoming Activities', 'What is committed for next period.', 0.72),
      ),
      table('risks', 'Key Risks / Challenges', 'Risks and challenges raised in the note.', [
        col('risk', 'Risk / Challenge', 'The risk, in their words.', 2.1),
        IMPACT,
        RAISED,
        OWNER,
        MITIGATION,
        col('closure', 'Expected closure', 'A date alone, as written. Empty if none.', 1.4),
      ], 0.7, 3),
    ],
  },

  {
    id: 'raid',
    name: 'RAID log',
    description: 'Risks, assumptions, issues and dependencies on one page.',
    audience: 'a delivery lead and the people they escalate to',
    status: true,
    sections: [
      para('summary', 'Position', 'One or two sentences on what the log says overall.', 0.42),
      table('risks', 'Risks', 'Things that might happen.', [
        col('risk', 'Risk', 'The risk, in their words.', 2.6),
        IMPACT,
        OWNER,
        col('response', 'Response', 'What is being done, if stated.', 2.0),
      ], 0.72, 3),
      table('issues', 'Issues', 'Things that have already happened.', [
        col('issue', 'Issue', 'The issue, in their words.', 2.6),
        IMPACT,
        OWNER,
        DUE,
      ], 0.72, 3),
      ...pair(
        list('assumptions', 'Assumptions', 'What the plan takes for granted. Only if stated.', 0.6, 4),
        list('dependencies', 'Dependencies', 'What this waits on, and on whom.', 0.6, 4),
      ),
    ],
  },

  {
    id: 'project-charter',
    name: 'Project charter',
    description: 'The one-page kickoff: why, what, who, and what is out of scope.',
    audience: 'a sponsor deciding whether to fund and start it',
    status: true,
    sections: [
      fields([
        f('sponsor', 'Sponsor', 'Named sponsor, else empty.', 1.6),
        f('lead', 'Project Lead', 'Named lead, else empty.', 1.6),
        f('start', 'Start', 'Start date as written, else empty.', 1.2),
        f('end', 'Target End', 'Target end date as written, else empty.', 1.2),
      ]),
      para('problem', 'Problem Statement', 'What is wrong today, in their words. Not the solution.', 0.5),
      para('objective', 'Objective', 'What done looks like. Measurable if the note gives numbers.', 0.44),
      ...pair(
        list('scope', 'In Scope', 'What this covers.', 0.66, 5),
        list('outOfScope', 'Out of Scope', 'What it explicitly does not. Only if stated — this is where teams invent.', 0.66, 5),
      ),
      table('milestones', 'Milestones', 'Dated checkpoints, if the note gives them.', [
        col('milestone', 'Milestone', 'The checkpoint.', 3.0),
        DUE,
        OWNER,
        col('note', 'Note', 'Anything qualifying it. Empty if none.', 2.4),
      ], 0.6, 3),
    ],
  },

  {
    id: 'incident-postmortem',
    name: 'Incident postmortem',
    description: 'What broke, for how long, why, and what stops it happening again.',
    audience: 'engineers who will fix it and a manager who will be asked about it',
    status: true,
    sections: [
      fields([
        f('incidentId', 'Incident', 'Incident id or ticket, else NA.', 1.2),
        f('severity', 'Severity', 'Severity as written, else empty.', 1.0),
        f('detected', 'Detected', 'When it was detected, as written.', 1.4),
        f('resolved', 'Resolved', 'When it was resolved, as written.', 1.4),
        f('duration', 'Duration', 'Only if stated or directly implied by the two times above.', 1.2),
      ]),
      para('impact', 'Customer Impact', 'Who was affected and how. Numbers only if the note gives them.', 0.46),
      para('cause', 'Root Cause', 'What actually caused it. Not the trigger — the cause. Empty if the note does not say.', 0.5),
      list('timeline', 'Timeline', 'What happened when. Each entry a time and an event, as written.', 0.72, 6),
      table('actions', 'Follow-up Actions', 'What stops this recurring.', [
        col('action', 'Action', 'The action.', 3.4),
        OWNER,
        DUE,
        col('type', 'Type', 'Prevent, detect or mitigate — only if the note makes it clear.', 1.0),
      ], 0.66, 4),
    ],
  },

  {
    id: 'change-request',
    name: 'Change request',
    description: 'A CAB-ready change: what, when, blast radius, and how to back out.',
    audience: 'a change advisory board approving or rejecting it',
    status: true,
    sections: [
      fields([
        f('changeId', 'Change', 'Change id if given, else NA.', 1.2),
        f('type', 'Type', 'Standard, normal or emergency — only if stated.', 1.2),
        f('window', 'Window', 'The change window as written.', 1.8),
        f('requester', 'Requester', 'Who is asking, as named.', 1.4),
      ]),
      para('description', 'What Is Changing', 'The change itself, plainly.', 0.46),
      para('justification', 'Why Now', 'The reason it cannot wait or should not. Empty if the note does not say.', 0.42),
      ...pair(
        list('affected', 'Systems Affected', 'What this touches. Only what is named.', 0.6, 5),
        list('backout', 'Backout Plan', 'How to undo it, and how long that takes.', 0.6, 5),
      ),
      table('risks', 'Risks', 'What could go wrong during the change.', [
        col('risk', 'Risk', 'The risk.', 3.0),
        IMPACT,
        MITIGATION,
      ], 0.56, 3),
    ],
  },

  {
    id: 'release-notes',
    name: 'Release notes',
    description: 'What shipped, what changed for users, and what to watch.',
    audience: 'the teams who support it and the people who use it',
    status: true,
    sections: [
      fields([
        f('release', 'Release', 'Version or release name as written.', 1.6),
        f('date', 'Date', 'Release date as written.', 1.4),
        f('environment', 'Environment', 'Where it went, if stated.', 1.6),
      ]),
      para('summary', 'Summary', 'One or two sentences on what this release is for.', 0.44),
      ...pair(
        list('features', 'New', 'What is new. User-visible things first.', 0.72, 6),
        list('fixes', 'Fixed', 'What was broken and now is not.', 0.72, 6),
      ),
      ...pair(
        list('known', 'Known Issues', 'What is still wrong. Only if stated.', 0.6, 4),
        list('actions', 'Action Required', 'What anyone must do — upgrade, reconfigure, clear a cache.', 0.6, 4),
      ),
    ],
  },

  {
    id: 'adr',
    name: 'Architecture decision record',
    description: 'A decision, its context, the options weighed and what it costs.',
    audience: 'the engineer who arrives in two years and asks why it is like this',
    status: true,
    sections: [
      fields([
        f('adrId', 'ADR', 'Number or id if given, else NA.', 1.0),
        f('date', 'Date', 'Decision date as written.', 1.4),
        f('deciders', 'Deciders', 'Who decided, as named.', 2.6),
      ]),
      para('context', 'Context', 'The forces at play. What made a decision necessary.', 0.54),
      para('decision', 'Decision', 'What was decided, stated as a decision: "We will ...".', 0.44),
      table('options', 'Options Considered', 'The alternatives and why they lost.', [
        col('option', 'Option', 'The alternative.', 2.2),
        col('pros', 'For', 'What was good about it, if stated.', 2.6),
        col('cons', 'Against', 'Why it was not chosen, if stated.', 2.6),
      ], 0.66, 3),
      ...pair(
        list('consequences', 'Consequences', 'What this makes easier and harder. Both, if the note gives both.', 0.56, 4),
        list('followups', 'Follow-ups', 'What must now happen because of this.', 0.56, 4),
      ),
    ],
  },

  {
    id: 'migration-cutover',
    name: 'Cutover plan',
    description: 'The runbook view: sequence, timings, owners, and the go/no-go.',
    audience: 'everyone awake at 2am on the night',
    status: true,
    sections: [
      fields([
        f('window', 'Window', 'The cutover window as written.', 2.0),
        f('lead', 'Cutover Lead', 'Who runs it, as named.', 1.6),
        f('rollbackBy', 'Rollback By', 'The last moment a rollback can start, if stated.', 1.6),
      ]),
      para('scope', 'What Moves', 'What is being cut over, plainly.', 0.42),
      table('steps', 'Sequence', 'The ordered steps.', [
        col('step', 'Step', 'What happens.', 3.4),
        col('time', 'Time', 'Planned time or duration, as written.', 1.1),
        OWNER,
        col('depends', 'Depends On', 'What must finish first, if stated.', 1.8),
      ], 0.9, 5),
      ...pair(
        list('goNoGo', 'Go / No-Go Criteria', 'What must be true to proceed. Only if stated.', 0.56, 4),
        list('rollback', 'Rollback Triggers', 'What makes the team back out.', 0.56, 4),
      ),
    ],
  },

  {
    id: 'service-review',
    name: 'Service review',
    description: 'How a service performed: volumes, SLAs, what hurt and what is being done.',
    audience: 'a service owner and the business they report to',
    status: true,
    sections: [
      fields([
        f('service', 'Service', 'The service name as written.', 2.4),
        f('period', 'Period', 'The review period as written.', 1.8),
        f('owner', 'Service Owner', 'Who owns it, as named.', 1.8),
      ]),
      para('summary', 'Summary', 'How the period went. The position, not a list.', 0.44),
      table('metrics', 'Service Metrics', 'Only numbers the note actually gives.', [
        col('metric', 'Metric', 'What is measured.', 2.4),
        col('target', 'Target', 'The target, if stated.', 1.2),
        col('actual', 'Actual', 'The result, as written.', 1.2),
        col('comment', 'Comment', 'Why, if the note explains it.', 2.8),
      ], 0.72, 4),
      ...pair(
        list('incidents', 'Notable Incidents', 'What went wrong and what it cost.', 0.6, 4),
        list('improvements', 'Improvements', 'What is being changed as a result.', 0.6, 4),
      ),
    ],
  },

  {
    id: 'capacity-report',
    name: 'Capacity report',
    description: 'What is running out, when, and what to buy or reclaim.',
    audience: 'an infrastructure lead and whoever signs purchase orders',
    status: true,
    sections: [
      para('summary', 'Position', 'What is tight and how long there is.', 0.44),
      table('capacity', 'Capacity', 'Only figures the note gives. Never estimate a headroom.', [
        col('resource', 'Resource', 'What is measured — compute, storage, licences, racks.', 2.2),
        col('used', 'Used', 'Current usage as written.', 1.1),
        col('total', 'Total', 'Total available as written.', 1.1),
        col('headroom', 'Headroom', 'Only if the note states it. Do not compute one.', 1.2),
        col('exhaust', 'Exhausted By', 'The date it runs out, only if stated.', 1.4),
      ], 0.9, 5),
      ...pair(
        list('drivers', 'What Is Driving It', 'Why demand is where it is.', 0.6, 4),
        list('actions', 'Recommended Actions', 'Buy, reclaim, or defer. Only what the note proposes.', 0.6, 4),
      ),
    ],
  },

  {
    id: 'vendor-review',
    name: 'Vendor review',
    description: 'How a supplier is performing against what was agreed.',
    audience: 'a contract owner preparing for a renewal conversation',
    status: true,
    sections: [
      fields([
        f('vendor', 'Vendor', 'The supplier name as written.', 2.2),
        f('contract', 'Contract', 'Contract reference if given, else NA.', 1.6),
        f('renewal', 'Renewal', 'Renewal or expiry date as written.', 1.6),
        f('spend', 'Spend', 'Only if the note gives a figure.', 1.4),
      ]),
      para('summary', 'Summary', 'Where the relationship stands.', 0.44),
      ...pair(
        list('working', 'Working Well', 'What the supplier is doing right.', 0.66, 4),
        list('concerns', 'Concerns', 'What is not working. Do not soften this.', 0.66, 4),
      ),
      table('actions', 'Actions', 'What has been asked of whom.', [
        col('action', 'Action', 'The ask.', 3.4),
        OWNER,
        DUE,
        col('status', 'Status', 'Where it stands, if the note says.', 1.4),
      ], 0.66, 4),
    ],
  },

  {
    id: 'security-posture',
    name: 'Security posture',
    description: 'Open findings, what is being remediated, and what is accepted.',
    audience: 'a security lead and the risk committee',
    status: true,
    sections: [
      para('summary', 'Position', 'Where the estate stands. Blunt.', 0.44),
      table('findings', 'Open Findings', 'Only findings the note names.', [
        col('finding', 'Finding', 'What was found.', 2.8),
        col('severity', 'Severity', 'As written. Empty if not stated.', 1.0),
        col('affected', 'Affected', 'What it affects, as named.', 1.8),
        OWNER,
        DUE,
      ], 0.9, 5),
      ...pair(
        list('remediated', 'Closed This Period', 'What was fixed.', 0.6, 4),
        list('accepted', 'Accepted Risks', 'What is knowingly not being fixed, and who accepted it.', 0.6, 4),
      ),
    ],
  },

  {
    id: 'sprint-review',
    name: 'Sprint review',
    description: 'What the sprint delivered, what slipped and what it learned.',
    audience: 'the team and its stakeholders',
    status: true,
    sections: [
      fields([
        f('sprint', 'Sprint', 'Sprint name or number as written.', 1.4),
        f('dates', 'Dates', 'Sprint dates as written.', 1.8),
        f('team', 'Team', 'Team name, as named.', 1.8),
        f('committed', 'Committed / Done', 'Only if the note gives both numbers.', 1.6),
      ]),
      para('goal', 'Sprint Goal', 'The goal as stated, and whether it was met.', 0.44),
      ...pair(
        list('delivered', 'Delivered', 'What got to done.', 0.72, 6),
        list('carried', 'Carried Over', 'What did not, and why if the note says.', 0.72, 6),
      ),
      ...pair(
        list('learned', 'What We Learned', 'Retrospective points. Only what was said.', 0.56, 4),
        list('actions', 'Actions', 'What the team will change, with owners if named.', 0.56, 4),
      ),
    ],
  },

  {
    id: 'budget-status',
    name: 'Budget status',
    description: 'Spend against plan, what moved it, and what is coming.',
    audience: 'a budget holder and their finance partner',
    status: true,
    sections: [
      fields([
        f('period', 'Period', 'The period as written.', 1.8),
        f('budget', 'Budget', 'Total budget, only if stated.', 1.6),
        f('spent', 'Spent', 'Spend to date, only if stated.', 1.6),
        f('forecast', 'Forecast', 'Forecast outturn, only if stated.', 1.6),
      ]),
      para('summary', 'Position', 'Where the budget stands. Say over or under plainly.', 0.44),
      table('lines', 'By Line', 'Only lines and figures the note gives.', [
        col('line', 'Line', 'What the money is for.', 2.6),
        col('budget', 'Budget', 'As written.', 1.2),
        col('actual', 'Actual', 'As written.', 1.2),
        col('variance', 'Variance', 'Only if stated. Do not compute one.', 1.2),
        col('comment', 'Comment', 'Why, if explained.', 2.4),
      ], 0.72, 4),
      list('drivers', 'What Moved It', 'The reasons behind the variance.', 0.56, 4),
    ],
  },
];

export function formatById(id: string): FormatDef | undefined {
  return FORMATS.find((f) => f.id === id);
}

/** The picker: enough to choose from without opening each one. */
export function formatIndex(): { id: string; name: string; description: string }[] {
  return FORMATS.map(({ id, name, description }) => ({ id, name, description }));
}
