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

/**
 * The hardest cell in the building to get right.
 *
 * A real note describes a risk as a story — who asked whom, how many times, what
 * they keep saying. Copying that story into a table gives a director a paragraph
 * where they expected a heading, and it happened on the first real test: "asked
 * for 3 weeks ago, marcus chased twice, they say next week every week" instead
 * of "Northgate API spec 3 weeks overdue".
 */
const RISK = (width: number) =>
  col(
    'risk',
    'Risk / Challenge',
    'Name it in one line, as a heading somebody scans in a meeting: "Northgate API spec 3 weeks overdue". Their terms, their names and their numbers exactly as given — but written, not the sentence from the note. Who chased whom and how often is the story of how it came up; that belongs in Mitigation or nowhere.',
    width,
  );

/**
 * What counts as one.
 *
 * The first real test produced six risks, of which three were facts: an
 * environment not updated, somebody on leave, work carried over again. All true,
 * all in the note, none of them risks — and each one crowds out something that
 * is. "Risks and challenges raised in the note" invited every loose end on the
 * page, because every loose end is a challenge to somebody.
 */
const RISK_TEST =
  'Only what could still go wrong AND would cost something if it did. A fact is not a risk: an environment not updated, a person on leave, work carried over again — those belong in the body of the report unless the note says what they threaten. If you cannot say what it would cost, that is the sign it is not one. Four real risks beat six with two padding them.';

export const FORMATS: FormatDef[] = [
  {
    id: 'weekly-status',
    name: 'Weekly status report',
    description: 'A project status one-pager — where it stands, what moved, what is in the way.',
    audience: 'a director who reads nothing else about this project all week',
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
      table('risks', 'Key Risks / Challenges', RISK_TEST, [
        RISK(2.1),
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
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
    sections: [
      para('summary', 'Position', 'One or two sentences on what the log says overall.', 0.42),
      table('risks', 'Risks', `Things that MIGHT still happen. Anything that already has is an Issue and belongs in the table below, not here. ${RISK_TEST}`, [
        { ...RISK(2.6), label: 'Risk' },
        IMPACT,
        OWNER,
        col('response', 'Response', 'What is being done, if stated.', 2.0),
      ], 0.72, 3),
      table('issues', 'Issues', 'Things that have ALREADY happened and are costing something now. If it has not happened yet it is a Risk and belongs in the table above. If it happened and was dealt with, it belongs in neither.', [
        col(
          'issue',
          'Issue',
          'Name it in one line, as a heading somebody scans: "2 accounts failed to reconcile in the dry run". Their terms and their numbers exactly as given, but written — not the sentence from the note.',
          2.6,
        ),
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
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
      table('risks', 'Risks', `What could go wrong during this change. ${RISK_TEST}`, [
        { ...RISK(3.0), label: 'Risk' },
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Engineering',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Operations',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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
    category: 'Project & delivery',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
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

  // ── Delivery documents ──────────────────────────────────────────────────────
  // These want to be Word rather than a slide: they are read closely, commented
  // on, and sent round. Same sections, longer form (lib/docs/format.ts).

  {
    id: 'user-story',
    name: 'User story',
    description: 'A story with acceptance criteria a tester could actually run.',
    audience: 'the developer who builds it and the tester who proves it',
    category: 'Requirements & testing',
    status: true,
    outputs: ['docx', 'pptx', 'pdf'],
    sections: [
      fields([
        f('storyId', 'Story', 'Ticket reference if given, else NA.', 1.2),
        f('epic', 'Epic', 'Parent epic if named, else empty.', 2.0),
        f('points', 'Estimate', 'Only if the note gives one.', 1.2),
        f('sprint', 'Sprint', 'Target sprint if named.', 1.4),
      ]),
      para('story', 'Story', 'As a … I want … so that …. Use their words. If the note does not give a "so that", leave it out rather than inventing a motive.', 0.5),
      list('criteria', 'Acceptance Criteria', 'One testable statement per line. Given/when/then where the note supports it. A criterion nobody could fail is not a criterion.', 0.9, 8),
      ...pair(
        list('outOfScope', 'Not In This Story', 'What is deliberately excluded. Only if stated.', 0.6, 5),
        list('dependencies', 'Depends On', 'What must exist first, and on whom.', 0.6, 5),
      ),
      list('notes', 'Notes', 'Anything else the note carries — designs, edge cases, questions.', 0.6, 6),
    ],
  },

  {
    id: 'epic-brief',
    name: 'Epic brief',
    description: 'What an epic is for, what it includes, and how anyone will know it worked.',
    audience: 'a product owner and the team that will pick it up',
    category: 'Requirements & testing',
    status: true,
    outputs: ['docx', 'pptx', 'pdf'],
    sections: [
      fields([
        f('epicId', 'Epic', 'Reference if given, else NA.', 1.2),
        f('owner', 'Owner', 'Who owns it, as named.', 1.8),
        f('target', 'Target', 'Target date or release as written.', 1.6),
      ]),
      para('problem', 'Problem', 'What is wrong today. Not the solution.', 0.5),
      para('outcome', 'Desired Outcome', 'What changes for someone if this works.', 0.46),
      list('success', 'How We Will Know', 'Measures. Only numbers the note gives — never invent a target.', 0.66, 5),
      ...pair(
        list('inScope', 'In Scope', 'What this covers.', 0.66, 6),
        list('outOfScope', 'Out of Scope', 'What it does not. Only if stated.', 0.66, 6),
      ),
      list('risks', 'Risks and Unknowns', 'What could sink it, and what nobody knows yet.', 0.6, 5),
    ],
  },

  {
    id: 'brd',
    name: 'Business requirements',
    description: 'What the business needs, why, and what counts as delivered.',
    audience: 'a business sponsor signing it off and the team estimating from it',
    category: 'Requirements & testing',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('reference', 'Reference', 'Document reference if given, else NA.', 1.4),
        f('sponsor', 'Sponsor', 'Business sponsor, as named.', 1.8),
        f('author', 'Author', 'Who wrote it, as named.', 1.6),
        f('date', 'Date', 'Date as written.', 1.2),
      ]),
      para('background', 'Background', 'How things work today and why that is a problem.', 0.6),
      para('objective', 'Objective', 'What this must achieve, in business terms.', 0.46),
      table('requirements', 'Requirements', 'Only requirements the note states. Never infer one from a complaint.', [
        col('ref', 'Ref', 'A reference if given, else a number in order.', 0.6),
        col('requirement', 'Requirement', 'What is required, as a statement.', 3.6),
        col('priority', 'Priority', 'Must, should or could — only if the note says.', 0.9),
        col('rationale', 'Rationale', 'Why, if the note explains it.', 2.4),
      ], 1.0, 8),
      ...pair(
        list('assumptions', 'Assumptions', 'What this takes for granted.', 0.6, 6),
        list('constraints', 'Constraints', 'What limits the solution — budget, dates, policy.', 0.6, 6),
      ),
      list('acceptance', 'Acceptance Criteria', 'What the sponsor will check before signing.', 0.6, 6),
    ],
  },

  {
    id: 'technical-design',
    name: 'Technical design',
    description: 'How it will be built, what it touches, and what was traded away.',
    audience: 'the engineers who will build it and whoever reviews the approach',
    category: 'Engineering',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('component', 'Component', 'What is being designed, as named.', 2.4),
        f('author', 'Author', 'Who wrote it, as named.', 1.6),
        f('reviewers', 'Reviewers', 'Named reviewers, else empty.', 2.0),
      ]),
      para('context', 'Context', 'What exists today and what is being added or changed.', 0.6),
      para('approach', 'Approach', 'The design itself, plainly.', 0.6),
      list('components', 'Components Affected', 'Services, tables, queues, jobs — only what is named.', 0.66, 8),
      table('decisions', 'Decisions and Trade-offs', 'What was chosen and what it costs.', [
        col('decision', 'Decision', 'What was decided.', 2.6),
        col('alternative', 'Instead Of', 'What was rejected, if stated.', 2.4),
        col('why', 'Why', 'The reason, if given.', 3.0),
      ], 0.8, 6),
      ...pair(
        list('risks', 'Risks', 'What could go wrong with this approach.', 0.6, 5),
        list('openQuestions', 'Open Questions', 'What is not settled. Only what the note raises.', 0.6, 5),
      ),
      list('testing', 'How It Will Be Tested', 'The test approach, if the note covers it.', 0.6, 5),
    ],
  },

  {
    id: 'test-plan',
    name: 'Test plan',
    description: 'What will be tested, how, by whom, and what would stop a release.',
    audience: 'testers running it and a release manager deciding on it',
    category: 'Requirements & testing',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('release', 'Release', 'What is being tested, as named.', 2.0),
        f('lead', 'Test Lead', 'Who owns testing, as named.', 1.6),
        f('window', 'Window', 'Test window as written.', 1.8),
        f('environment', 'Environment', 'Where testing runs, if stated.', 1.6),
      ]),
      para('scope', 'Scope', 'What is in and out of this round of testing.', 0.5),
      table('cases', 'Test Coverage', 'Areas to be covered. Only what the note names.', [
        col('area', 'Area', 'What is being tested.', 2.4),
        col('approach', 'Approach', 'Manual, automated, exploratory — if stated.', 1.6),
        OWNER,
        col('notes', 'Notes', 'Anything qualifying it.', 2.6),
      ], 0.9, 8),
      ...pair(
        list('entry', 'Entry Criteria', 'What must be true before testing starts.', 0.6, 5),
        list('exit', 'Exit Criteria', 'What must be true to call it done.', 0.6, 5),
      ),
      list('risks', 'Risks to the Plan', 'What could stop testing happening. Only if stated.', 0.6, 5),
    ],
  },

  {
    id: 'uat-signoff',
    name: 'UAT sign-off',
    description: 'What was tested, what was found, and whether it is accepted.',
    audience: 'a business owner putting their name to it',
    category: 'Requirements & testing',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('release', 'Release', 'What was tested, as named.', 2.0),
        f('period', 'Period', 'Testing dates as written.', 1.8),
        f('owner', 'Business Owner', 'Who signs, as named.', 1.8),
      ]),
      para('summary', 'Summary', 'What was tested and how it went. Say plainly whether it passed.', 0.5),
      table('defects', 'Outstanding Defects', 'Only defects the note raises.', [
        col('defect', 'Defect', 'What is wrong.', 3.0),
        col('severity', 'Severity', 'As written. Empty if not stated.', 1.0),
        OWNER,
        col('decision', 'Decision', 'Fix now, fix later, or accept — only if stated.', 2.2),
      ], 0.9, 6),
      ...pair(
        list('tested', 'What Was Tested', 'Scenarios covered.', 0.66, 8),
        list('notTested', 'Not Tested', 'What was left, and why. This is where honesty matters most.', 0.66, 6),
      ),
      para('decision', 'Decision', 'Accepted, accepted with conditions, or rejected — only what the note says.', 0.44),
    ],
  },

  {
    id: 'runbook',
    name: 'Runbook',
    description: 'How to run it, what breaks, and what to do at 3am.',
    audience: 'someone on call who has never seen this system before',
    category: 'Operations',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('service', 'Service', 'The service, as named.', 2.4),
        f('owner', 'Owner', 'Owning team, as named.', 1.8),
        f('escalation', 'Escalation', 'Who to wake, if stated.', 2.0),
      ]),
      para('purpose', 'What It Does', 'The service in two sentences, for someone who has never seen it.', 0.5),
      table('procedures', 'Procedures', 'Named operations and how to do them.', [
        col('procedure', 'Procedure', 'What you are doing.', 2.4),
        col('steps', 'Steps', 'How, as written in the note.', 4.0),
        col('caution', 'Caution', 'What to watch for, only if stated.', 2.0),
      ], 1.0, 8),
      table('alerts', 'Common Alerts', 'What fires and what it means.', [
        col('alert', 'Alert', 'The alert as named.', 2.4),
        col('means', 'What It Means', 'The interpretation, if given.', 3.0),
        col('do', 'What To Do', 'The response, if given.', 3.0),
      ], 0.9, 6),
      list('checks', 'Health Checks', 'How to tell it is working.', 0.6, 6),
    ],
  },

  {
    id: 'retrospective',
    name: 'Retrospective',
    description: 'What the team said, and what it will actually change.',
    audience: 'the team, and nobody above them unless they choose',
    category: 'Project & delivery',
    status: false,
    outputs: ['docx', 'pptx', 'pdf'],
    sections: [
      fields([
        f('team', 'Team', 'Team name, as named.', 2.0),
        f('period', 'Period', 'Sprint or period as written.', 1.8),
        f('attended', 'Attended', 'Who was there, if the note says.', 2.2),
      ]),
      ...pair(
        list('went', 'What Went Well', 'Only what was said. Do not add encouragement.', 0.72, 8),
        list('didnt', 'What Did Not', 'Only what was said. Do not soften it — this is the half that matters.', 0.72, 8),
      ),
      list('learned', 'What We Learned', 'Observations rather than complaints.', 0.6, 6),
      table('actions', 'Actions', 'What will change, and who owns it. An action without an owner is a wish.', [
        col('action', 'Action', 'What will be done differently.', 3.4),
        OWNER,
        DUE,
        col('measure', 'How We Will Know', 'Only if stated.', 2.0),
      ], 0.8, 6),
    ],
  },

  {
    id: 'rfc',
    name: 'RFC',
    description: 'A proposal put to colleagues before it is built.',
    audience: 'engineers who will argue with it, which is the point',
    category: 'Engineering',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('rfcId', 'RFC', 'Reference if given, else NA.', 1.2),
        f('author', 'Author', 'Who proposes it, as named.', 1.8),
        f('date', 'Date', 'Date as written.', 1.4),
        f('closes', 'Comments By', 'When comment closes, if stated.', 1.6),
      ]),
      para('summary', 'Summary', 'The proposal in three sentences.', 0.5),
      para('motivation', 'Motivation', 'What problem this solves and why now.', 0.5),
      para('proposal', 'Proposal', 'What is actually being proposed.', 0.6),
      table('alternatives', 'Alternatives Considered', 'What else was looked at.', [
        col('alternative', 'Alternative', 'The option.', 2.6),
        col('why', 'Why Not', 'The reason it was not chosen, if stated.', 3.4),
      ], 0.7, 5),
      ...pair(
        list('drawbacks', 'Drawbacks', 'What this costs. Only what the note admits.', 0.6, 5),
        list('unresolved', 'Unresolved', 'What the author does not know yet.', 0.6, 5),
      ),
    ],
  },

  {
    id: 'handover',
    name: 'Handover',
    description: 'What the next person needs to know, before you are unavailable.',
    audience: 'whoever picks this up, possibly in a hurry',
    category: 'Engineering',
    status: true,
    outputs: ['docx', 'pdf'],
    sections: [
      fields([
        f('what', 'Handing Over', 'What is being handed over, as named.', 2.4),
        f('from', 'From', 'Who is handing over, as named.', 1.6),
        f('to', 'To', 'Who is receiving, as named.', 1.6),
        f('date', 'Date', 'Effective date as written.', 1.4),
      ]),
      para('state', 'Where Things Stand', 'The honest current position, not the plan.', 0.6),
      list('inFlight', 'In Flight', 'What is part-done, and how far.', 0.72, 8),
      table('contacts', 'Who To Ask', 'People and what they know.', [
        col('person', 'Person', 'As named.', 1.8),
        col('about', 'About', 'What they can help with.', 3.4),
        col('how', 'How To Reach', 'Only if the note gives it.', 2.0),
      ], 0.8, 6),
      ...pair(
        list('watch', 'Things To Watch', 'What tends to go wrong.', 0.6, 6),
        list('access', 'Access Needed', 'Systems, accounts, approvals to arrange.', 0.6, 6),
      ),
    ],
  },

  // ── Packs ───────────────────────────────────────────────────────────────────
  // Same sections, more room. These are presented rather than circulated: a
  // steering committee is walked through an argument, not handed a dense page
  // and left to read it while somebody talks over them.

  {
    id: 'steerco',
    name: 'Steering committee pack',
    description: 'The full walkthrough — position, progress, risks, decisions needed.',
    audience: 'a steering committee who will be asked to decide something',
    category: 'Governance packs',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
    layout: 'pack',
    sections: [
      fields([
        f('programme', 'Programme', 'The programme name as written.', 2.4),
        f('period', 'Period', 'Reporting period as written.', 1.6),
        f('sro', 'SRO', 'Senior responsible owner, as named.', 1.8),
        f('nextReview', 'Next Review', 'Next review date, if stated.', 1.6),
      ]),
      para('position', 'Where We Are', 'Three or four sentences. The position, and whether the date holds. Open with the answer, not the activity — this committee has read a hundred of these.', 0.6),
      list('progress', 'Progress Since Last Time', 'What actually moved. Completed things.', 0.8, 6),
      table('workstreams', 'Workstreams', 'Only workstreams the note names.', [
        col('workstream', 'Workstream', 'The workstream.', 2.4),
        col('status', 'Status', 'Its status, only if the note gives one.', 1.2),
        OWNER,
        col('note', 'Note', 'What is going on, if the note says.', 3.2),
      ], 0.9, 6),
      table('risks', 'Risks Needing This Group', `Only what the note escalates to this group — something they are being asked to act on, not the whole log. ${RISK_TEST}`, [
        { ...RISK(2.6), label: 'Risk' },
        IMPACT,
        OWNER,
        col('ask', 'What We Need', 'What is being asked of the committee, if stated.', 2.4),
      ], 0.9, 5),
      list('decisions', 'Decisions Needed Today', 'What this group must decide. Put the risk before the ask. An item with no decision in it is not a decision needed.', 0.8, 5),
      ...pair(
        list('nextPeriod', 'Next Period', 'What is committed next.', 0.7, 6),
        list('watch', 'Watching', 'What has not become a risk yet.', 0.7, 6),
      ),
    ],
  },

  {
    id: 'programme-review',
    name: 'Programme review pack',
    description: 'A deeper walkthrough — benefits, finance, delivery and dependencies.',
    audience: 'a portfolio board comparing this against everything else running',
    category: 'Governance packs',
    status: true,
    outputs: ['pptx', 'docx', 'pdf'],
    layout: 'pack',
    sections: [
      fields([
        f('programme', 'Programme', 'The programme name as written.', 2.4),
        f('stage', 'Stage', 'Where in its life it is, if stated.', 1.6),
        f('spend', 'Spend to Date', 'Only if the note gives a figure.', 1.6),
        f('forecast', 'Forecast', 'Only if the note gives a figure.', 1.6),
      ]),
      para('summary', 'Summary', 'Where the programme stands, plainly. Say over or late if it is.', 0.6),
      list('benefits', 'Benefits', 'What this is meant to deliver, and whether it still will. Only claims the note makes.', 0.8, 6),
      table('milestones', 'Milestones', 'Dated checkpoints and whether they hold.', [
        col('milestone', 'Milestone', 'The checkpoint.', 2.8),
        DUE,
        col('status', 'Status', 'Only if the note gives one.', 1.2),
        col('note', 'Note', 'Anything qualifying it.', 2.6),
      ], 0.9, 6),
      table('dependencies', 'Dependencies', 'What this waits on, outside its own control.', [
        col('dependency', 'Dependency', 'What is depended on.', 2.6),
        col('on', 'On Whom', 'Team or supplier, as named.', 1.6),
        DUE,
        IMPACT,
      ], 0.9, 5),
      list('asks', 'Asks', 'What the programme needs from this board.', 0.8, 5),
    ],
  },
];

export function formatById(id: string): FormatDef | undefined {
  return FORMATS.find((f) => f.id === id);
}

/** The picker: enough to choose from without opening each one. */
export function formatIndex(): {
  id: string;
  name: string;
  description: string;
  outputs: FormatDef['outputs'];
}[] {
  return FORMATS.map(({ id, name, description, outputs }) => ({ id, name, description, outputs }));
}
