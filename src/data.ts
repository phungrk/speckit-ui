import type { Draft, Requirement, Role, Task, Workspace } from './types';

export const ROLES: Role[] = ['Director', 'Designer', 'Engineer', 'QA'];

export const SK: Workspace = {
  project: 'Wallet App',
  people: {
    Director: { name: 'Mai Tran', ini: 'MT' },
    Designer: { name: 'Linh Pham', ini: 'LP' },
    Engineer: { name: 'Duc Nguyen', ini: 'DN' },
    QA: { name: 'An Vo', ini: 'AV' }
  },
  phases: [
    { k: 'constitution', n: 'Constitution', cmd: '/speckit.constitution', file: 'memory/constitution.md', gate: ['Director'], what: 'Project principles every spec must respect' },
    { k: 'specify', n: 'Specify', cmd: '/speckit.specify', file: 'spec.md', gate: ['Director', 'Designer'], what: 'What and why. No tech decisions' },
    { k: 'clarify', n: 'Clarify', cmd: '/speckit.clarify', file: 'spec.md § Clarifications', gate: ['Designer', 'Engineer'], what: 'Resolve ambiguity before planning' },
    { k: 'plan', n: 'Plan', cmd: '/speckit.plan', file: 'plan.md', gate: ['Engineer', 'QA'], what: 'Stack, architecture, data model, contracts' },
    { k: 'tasks', n: 'Tasks', cmd: '/speckit.tasks', file: 'tasks.md', gate: ['Engineer', 'QA'], what: 'Ordered, testable work units per story' },
    { k: 'analyze', n: 'Analyze', cmd: '/speckit.analyze', file: 'analysis report', gate: ['QA', 'Engineer', 'Director'], what: 'Cross-check spec, plan and tasks' },
    { k: 'implement', n: 'Implement', cmd: '/speckit.implement', file: 'PRs + verification', gate: ['QA'], what: 'Build, then verify against acceptance' }
  ],
  constitution: {
    version: 'v1.2.0', ratified: '2026-08-04',
    principles: [
      ['Spec before code', 'No branch is opened without an approved spec.md. Changes in scope go back through Specify.'],
      ['Accessible by default', 'Every screen meets WCAG 2.2 AA. Designer signs off on the accessibility notes in each spec.'],
      ['Test-first for money movement', 'Any path that moves funds has failing contract and integration tests before implementation.'],
      ['Design system only', 'UI is composed from the shared design system. One-off components require a recorded exception.'],
      ['Observable money paths', 'Every money-moving action emits an audit event with user, amount, rule and outcome.']
    ]
  },
  features: [
    { id: '001', slug: '001-account-onboarding', title: 'Account onboarding', status: ['done', 'done', 'done', 'done', 'done', 'done', 'done'], approvals: {}, summary: 'Sign-up, eKYC and first top-up. Shipped 2026-09-22.' },
    { id: '002', slug: '002-bill-split', title: 'Bill split', status: ['done', 'done', 'done', 'review', 'locked', 'locked', 'locked'], approvals: { plan: { Engineer: true } }, summary: 'Split a payment between up to 10 contacts and track who has paid.' },
    { id: '003', slug: '003-transfer-limits', title: 'Transfer limits & daily caps', detailed: true, status: ['done', 'done', 'done', 'done', 'done', 'review', 'locked'], approvals: { analyze: { Engineer: true } }, summary: 'Let account holders cap daily outgoing transfers and raise the cap temporarily with step-up auth.' },
    { id: '004', slug: '004-card-freeze', title: 'Card freeze', status: ['done', 'review', 'locked', 'locked', 'locked', 'locked', 'locked'], approvals: {}, summary: 'Freeze and unfreeze a virtual card instantly from the card screen.' },
    { id: '005', slug: '005-statement-export', title: 'Statement export', status: ['done', 'done', 'review', 'locked', 'locked', 'locked', 'locked'], approvals: { clarify: { Designer: true } }, summary: 'Export monthly statements as PDF and CSV.' }
  ],
  spec: {
    created: '2026-09-29',
    stories: [
      { id: 'US1', p: 'P1', title: 'Set a daily transfer limit', text: 'As an account holder, I can set a daily cap on outgoing transfers so a stolen session cannot drain my account.',
        ac: [['a limit of 5,000,000 VND and 4,000,000 VND already sent today', 'I send 2,000,000 VND', 'the transfer is blocked and I see 1,000,000 VND remaining'], ['I open Limits', 'I set a new cap', 'the new cap applies to the next transfer']] },
      { id: 'US2', p: 'P2', title: 'Raise the limit temporarily', text: 'As an account holder, I can raise my cap for a one-off large payment after confirming it is me.',
        ac: [['I request a raise to 50,000,000 VND', 'I pass step-up authentication', 'the raised cap is active for 24 hours'], ['a raised cap is active', '24 hours pass', 'the cap returns to my standard limit']] },
      { id: 'US3', p: 'P3', title: 'Warn before the limit is reached', text: 'As an account holder, I am told when most of today’s allowance is used.',
        ac: [['80% of today’s allowance is used', 'a transfer completes', 'I receive a push notification with the remaining amount']] }
    ],
    frs: [
      ['FR-001', 'System MUST let the user set a daily cap between 1,000,000 and 500,000,000 VND.'],
      ['FR-002', 'System MUST reset the daily allowance at 00:00 in the user’s local time zone.'],
      ['FR-003', 'Raising the cap above the standard limit MUST require step-up authentication.'],
      ['FR-004', 'A temporary raise MUST expire 24 hours after activation.'],
      ['FR-005', 'System MUST notify the user when 80% of the daily allowance is used.']
    ],
    sc: [['SC-001', '95% of users set a limit in under 60 seconds.'], ['SC-002', 'Zero transfers exceed the active cap under load test (1,000 TPS).']]
  },
  clarify: [
    { q: 'When does the daily allowance reset?', opts: ['00:00 local time', 'Rolling 24 hours', '00:00 server time (UTC+7)'], a: 0, by: 'Engineer', date: '2026-10-01' },
    { q: 'How long does a temporary raise last?', opts: ['1 hour', '24 hours', 'Until end of day'], a: 1, by: 'Director', date: '2026-10-01' },
    { q: 'Which step-up method is required for a raise?', opts: ['PIN', 'Biometric, PIN as fallback', 'SMS OTP'], a: 1, by: 'Designer', date: '2026-10-02' }
  ],
  plan: {
    context: [['Language', 'TypeScript 5.4, Node 20'], ['Frontend', 'React 18 + shared design system'], ['Storage', 'PostgreSQL 15 (limits), Redis (running totals)'], ['Testing', 'Vitest, Playwright, k6 load tests'], ['Performance', 'Limit check p95 < 50 ms'], ['Constraints', 'No change to the core ledger schema']],
    checks: [['I. Spec before code', 'Pass'], ['II. Accessible by default', 'Pass'], ['III. Test-first for money movement', 'Pass'], ['IV. Design system only', 'Pass'], ['V. Observable money paths', 'Pass']],
    artifacts: [['plan.md', 'Approved'], ['research.md', '3 decisions'], ['data-model.md', '2 entities'], ['contracts/limits.yaml', '4 endpoints'], ['quickstart.md', '5 steps']],
    entities: [['TransferLimit', 'userId, dailyCap, tempCap, tempCapExpiresAt'], ['DailyUsage', 'userId, date, usedAmount, notifiedAt']]
  },
  tasks: [
    { g: 'Setup', id: 'T001', d: 'Create limits module and feature flag', f: 'services/limits/index.ts', o: 'Engineer' },
    { g: 'Setup', id: 'T002', p: true, d: 'Add TransferLimit and DailyUsage migrations', f: 'db/migrations/0042_limits.sql', o: 'Engineer' },
    { g: 'Foundational', id: 'T003', d: 'Contract tests for limits API (failing)', f: 'tests/contract/limits.test.ts', o: 'QA' },
    { g: 'Foundational', id: 'T004', p: true, d: 'Redis running-total counter with local-midnight reset', f: 'services/limits/usage.ts', o: 'Engineer' },
    { g: 'Foundational', id: 'T005', p: true, d: 'Audit event schema for limit decisions', f: 'services/audit/limit-event.ts', o: 'Engineer' },
    { g: 'US1', id: 'T006', s: 'US1', d: 'Enforce cap in transfer pipeline', f: 'services/transfer/guard.ts', o: 'Engineer' },
    { g: 'US1', id: 'T007', s: 'US1', p: true, d: 'Limits settings screen', f: 'app/settings/Limits.tsx', o: 'Designer' },
    { g: 'US1', id: 'T008', s: 'US1', d: 'Blocked-transfer message with remaining allowance', f: 'app/transfer/BlockedNotice.tsx', o: 'Designer' },
    { g: 'US1', id: 'T009', s: 'US1', d: 'Integration test: cap blocks over-limit transfer', f: 'tests/integration/cap.test.ts', o: 'QA' },
    { g: 'US2', id: 'T010', s: 'US2', d: 'Step-up auth flow for raise request', f: 'app/settings/RaiseLimit.tsx', o: 'Designer' },
    { g: 'US2', id: 'T011', s: 'US2', p: true, d: 'Temporary cap with 24h expiry job', f: 'services/limits/temp-cap.ts', o: 'Engineer' },
    { g: 'US2', id: 'T012', s: 'US2', d: 'Integration test: raise expires after 24h', f: 'tests/integration/temp-cap.test.ts', o: 'QA' },
    { g: 'US3', id: 'T013', s: 'US3', d: '80% threshold notification', f: 'services/notify/limit-warning.ts', o: 'Engineer' },
    { g: 'US3', id: 'T014', s: 'US3', p: true, d: 'Notification copy and deep link', f: 'app/notify/LimitWarning.tsx', o: 'Designer' },
    { g: 'Polish', id: 'T015', d: 'k6 load test at 1,000 TPS', f: 'tests/load/cap.k6.js', o: 'QA' },
    { g: 'Polish', id: 'T016', p: true, d: 'Accessibility review of limit screens', f: 'docs/a11y/limits.md', o: 'Designer' },
    { g: 'Polish', id: 'T017', d: 'Run quickstart.md end to end', f: 'specs/003/quickstart.md', o: 'QA' }
  ],
  findings: [
    { id: 'A1', sev: 'HIGH', cat: 'Coverage gap', loc: 'spec.md, tasks.md', d: 'Scheduled transfers are not covered. It is unclear whether they count against the day they were scheduled or the day they execute.', risk: 'scheduled transfers may bypass the daily cap.',
      opts: ['Add FR-006 + task T018 (count on execution day)', 'Defer to v2 with a recorded exception'] },
    { id: 'A2', sev: 'MEDIUM', cat: 'Ambiguity', loc: 'spec.md SC-001', d: 'SC-001 “under 60 seconds” has no measurement method.', opts: ['Measure from Limits screen open to save, via analytics', 'Accept as is'] },
    { id: 'A3', sev: 'LOW', cat: 'Inconsistency', loc: 'FR-002, T004', d: 'Reset rule is worded as “midnight” in research.md and “00:00 local” elsewhere.', opts: ['Normalise wording to “00:00 local time”', 'Ignore'] }
  ],
  activity: [
    ['Engineer', 'approved Analyze', '2h ago'],
    ['Engineer', 'ran /speckit.analyze: 3 findings', '3h ago'],
    ['QA', 'approved Tasks', 'Yesterday'],
    ['Engineer', 'approved Tasks', 'Yesterday'],
    ['Engineer', 'ran /speckit.tasks: 17 tasks', 'Yesterday'],
    ['QA', 'approved Plan', 'Oct 8'],
    ['Engineer', 'answered clarification Q1', 'Oct 1']
  ]
};

/** Simulated output of each command in the command bar. */
export const RUN_LOG: Record<string, string[]> = {
  constitution: ['Loading memory/constitution.md', 'No amendments proposed', 'Version unchanged: v1.2.0'],
  specify: ['Reading feature description', 'Drafting user scenarios and requirements', 'spec.md updated · 0 [NEEDS CLARIFICATION] markers'],
  clarify: ['Scanning spec.md for ambiguity', 'No high-impact questions remaining'],
  plan: ['Loading spec.md and constitution', 'Writing research.md, data-model.md, contracts/', 'Constitution check: 5 / 5 pass'],
  tasks: ['Loading plan.md and contracts/', 'Ordering by dependency, marking [P] tasks', 'tasks.md written'],
  analyze: ['Loading spec.md, plan.md, tasks.md', 'Mapping requirements to tasks', 'Report updated'],
  implement: ['Checking out 003-transfer-limits', 'Executing next unchecked task', 'Tests green · task checked off']
};

/** Task added to tasks.md when finding A1 is resolved with its first option. */
export const T018: Task = { g: 'US1', id: 'T018', s: 'US1', d: 'Count scheduled transfers on execution day', f: 'services/limits/scheduled.ts', o: 'Engineer', isNew: true };
export const FR006: Requirement = ['FR-006', 'Scheduled transfers MUST count against the allowance of the day they execute.'];

export const NS_EXAMPLE = 'Account holders want to schedule a transfer for a future date or repeat it weekly or monthly, so rent and allowances go out without them remembering. They should see upcoming transfers, skip one occurrence, or cancel the series. A scheduled transfer must respect the daily limit on the day it runs.';
export const NS_LOG = ['Reading feature description', 'Creating branch {b}', 'Copying spec-template.md', 'Drafting user scenarios', 'Deriving functional requirements', 'Checking against constitution v1.2.0', 'Writing checklists/requirements.md'];

/** The draft /speckit.specify produces in this demo. Content is fixed; only the name follows the user's input. */
export function makeDraft(desc: string): Draft {
  return {
    desc,
    stories: [
      { id: 'US1', p: 'P1', title: 'Schedule a one-off transfer', text: 'As an account holder, I can pick a future date for a transfer so it goes out without me.',
        ac: [['I schedule 3,000,000 VND for the 5th', 'the 5th arrives', 'the transfer is sent and I am notified']] },
      { id: 'US2', p: 'P2', title: 'Repeat a transfer', text: 'As an account holder, I can repeat a transfer weekly or monthly and manage the series.',
        ac: [['a monthly series exists', 'I skip the next occurrence', 'only that occurrence is not sent'], ['a series exists', 'I cancel it', 'no further occurrences are sent']] }
    ],
    frs: [
      ['FR-001', 'Users MUST be able to schedule a transfer up to 12 months ahead.'],
      ['FR-002', 'Users MUST be able to repeat a transfer weekly or monthly.'],
      ['FR-003', 'Users MUST be able to skip one occurrence or cancel a series.'],
      ['FR-004', 'Scheduled transfers MUST count against the daily limit of the day they execute.'],
      ['FR-005', 'When balance is insufficient on execution day, system MUST', '[NEEDS CLARIFICATION: retry later, fail and notify, or partial send?]'],
      ['FR-006', 'Monthly series set for the 29th–31st MUST', '[NEEDS CLARIFICATION: run on the last day of shorter months, or skip?]']
    ],
    sc: [['SC-001', 'Users create a recurring transfer in under 90 seconds.'], ['SC-002', '99.9% of scheduled transfers execute within 5 minutes of their scheduled time.']],
    checklist: [['No implementation details (languages, frameworks, APIs)', true], ['Focused on user value and business needs', true], ['Requirements are testable and unambiguous', false], ['Success criteria are measurable and tech-agnostic', true], ['No [NEEDS CLARIFICATION] markers remain', false], ['Constitution principles respected', true]]
  };
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
