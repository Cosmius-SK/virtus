import type { EntryKind } from './types';

/**
 * An organisation to try the tool against.
 *
 * The point of §3 is invisible until it is populated: a document written with
 * the organisation model in front of it and one written without look the same
 * until you know the names. Somebody meeting Virtus for the first time has an
 * empty store and therefore sees the version that cannot demonstrate its own
 * best feature.
 *
 * So there is a sample, and it is entirely invented — the same fictional firm
 * as the notes in docs/test-notes.md, so the two work together. A sample built
 * from a real client would be a disclosure sitting in the repository waiting
 * for someone to clone it.
 *
 * It is offered, never assumed. It loads on a press and every row is editable
 * and deletable afterwards, because the moment it stops being a demonstration
 * it is in the way.
 */
export const SAMPLE_ORG: { kind: EntryKind; name: string; about: string }[] = [
  // People — role, and what they care about, which is what changes the writing.
  { kind: 'person', name: 'Priya Raman', about: 'Delivery lead for Atlas. Wants the blocker named in the first line, not the third.' },
  { kind: 'person', name: 'Tom Alderton', about: 'CTO and programme sponsor. Reads the summary and the ask; decides in the meeting.' },
  { kind: 'person', name: 'Deepa Nair', about: 'Head of security. Cares whether a finding is accepted or merely open.' },
  { kind: 'person', name: 'Marcus Webb', about: 'Vendor management. Owns the Northgate and Bluefin relationships.' },
  { kind: 'person', name: 'Sofia Ellis', about: 'Product owner for the finance workstream. Speaks for what finance actually need.' },
  { kind: 'person', name: 'Ken Osei', about: 'SRE lead. Knows the reconciliation logic; currently the only one who does.' },
  { kind: 'person', name: 'Rachel Lim', about: 'Test manager. Will say when something has not been tested rather than that it passed.' },
  { kind: 'person', name: 'Javier Costa', about: 'Finance business partner. Owns the Atlas budget and the forecast to complete.' },

  { kind: 'client', name: 'Meridian Financial Services', about: 'The firm. Regulated, cautious, 7-year retention on anything financial.' },

  { kind: 'system', name: 'ATLAS', about: 'The new core platform. Always upper case. Never "Atlas Core".' },
  { kind: 'system', name: 'LEDGERLINE', about: 'The legacy general ledger, 19 years old. Vendor support ends in March.' },
  { kind: 'system', name: 'Harbour', about: 'The customer-facing portal. Not in scope for phase 2 — people assume it is.' },
  { kind: 'system', name: 'Sentinel', about: 'Monitoring and alerting. Where incidents are first seen.' },
  { kind: 'system', name: 'Kestrel Cloud', about: 'The cloud estate. Committed-use discount since May.' },

  { kind: 'product', name: 'Atlas', about: 'The programme replacing LEDGERLINE. Phase 2 is the ledger and reporting; phase 3 is Harbour and is unfunded.' },

  { kind: 'term', name: 'Northgate Systems', about: 'Software supplier. Contract renews in January — the point of leverage.' },
  { kind: 'term', name: 'Bluefin Support', about: 'Out-of-hours support partner. 15-minute response SLA.' },
  { kind: 'term', name: 'Cutover', about: 'The migration weekend itself. Not "go-live", which here means the Monday after.' },
  { kind: 'term', name: 'The freeze', about: 'The year-end change freeze, November to January. Nothing ships inside it.' },
  { kind: 'term', name: 'Control totals', about: 'The per-account sums that must match between systems. The go/no-go test at cutover.' },
];
