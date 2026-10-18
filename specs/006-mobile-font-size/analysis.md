## Specification Analysis Report: 006-mobile-font-size

Artifacts checked: `spec.md`, `plan.md`, `tasks.md` (T001–T023), `research.md`, `data-model.md`, `contracts/type-scale.md`, `quickstart.md`, and constitution v1.1.0. Cross-checked against `src/styles/*.css` and `src/**/*.tsx` on `feat/006-mobile-font-size`.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| I1 | Inconsistency | HIGH | tasks.md T002 and T014; contracts/type-scale.md | T002 requires that no `font-size: <number>px` remains outside the `--fs-N` declarations, but the rule mandated by T014 and the contract is `font-size: 16px !important`. A test written as T002 says cannot pass. | In T002, allow exactly one sanctioned literal rule (`input, select, textarea` in the phone block) and fail on any other literal. |
| U1 | Underspecification | MEDIUM | spec.md FR-002 and User Story 1 AS1; tasks.md T009–T010; live.css (`.sk-props li`, `.sk-files`) | FR-002 and AS1 want list rows at 16px, but the size-based mapping turns every 13px element into 14px. The spec does not say which elements are content, so only the T009 measurement exposes them. | Define content versus secondary text in data-model.md and give T009 and T010 that rule. |
| C1 | Coverage Gap | MEDIUM | spec.md edge case on OS font size; quickstart.md scenario 8; tasks.md T021 | The edge case "user sets a larger OS or browser font" has a scenario but no task runs it. Font sizes are in px, so that setting changes nothing; only page zoom does. | Reword the edge case as page zoom to 200% and add scenario 8 to T021. |
| E1 | Coverage Gap | MEDIUM | tasks.md Phase 1; environment | `node_modules` is absent and Playwright lives outside the repo (`/opt/node-tools`), so `npm test`, `npm run typecheck` and the measurement scripts cannot run as written. | Add `npm ci` and the `NODE_PATH` hint to the first task. |
| I2 | Inconsistency | LOW | tasks.md T001 | The baseline is to be taken "on `origin/main`", but this branch differs from it only by spec files, so a checkout is unnecessary. | Take the baseline on this branch before T003. |
| I3 | Inconsistency | LOW | live.css `.sk-md h1–h4`; data-model.md | Headings inside spec documents are 16px and map to 17px on a phone, while their body text maps from 14px to 16px, so the gap shrinks from 2px to 1px. | Optionally map `.sk-md` headings to `--fs-18`, or accept the weight-only contrast. |
| A1 | Ambiguity | LOW | spec.md SC-003; tasks.md T016 | "The page does not zoom when a field is tapped" can only be verified on iOS; the sandbox has Chromium only. | Accept. T016 already requires saying so in the PR if no iOS device was used. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 size table | Yes | T003, T017 | |
| FR-002 content 16px | Yes | T009, T010 | See U1 |
| FR-003 floor 12px | Yes | T002, T009 | |
| FR-004 inputs 16px | Yes | T014, T015, T016 | See I1 |
| FR-005 ≥ 761px unchanged | Yes | T008, T013, T020 | |
| FR-006 every screen | Yes | T004–T007, T009, T011, T012 | |
| FR-007 no horizontal overflow | Yes | T011, T012, T015, T018 | |
| FR-008 one shared set of values | Yes | T002, T003–T007, T019 | |
| FR-009 all three modes | Yes | T013, T021 | |
| FR-010 demo uses the phone sizes | Yes | T009, T013, T021 | No task of its own; covered by "every screen" |
| SC-001 | Yes | T009, T010 | |
| SC-002 | Yes | T002, T008, T020 | |
| SC-003 | Yes | T015, T016 | See A1 |
| SC-004 | Yes | T011, T012 | 360, 390, 430, 760 px |
| SC-005 | Yes | T002, T003 | |

**Constitution Alignment Issues:** None. Principles I, II and VI are untouched. III: modes affected are named. IV: tokens live in `modernist.css`, demo screenshots at 1440×900 and 924×540 (T001, T020), no new colour. V: static test and the four gate commands. VII: Non-goals section present, one `!important` justified in plan.md Complexity Tracking.

**Unmapped Tasks:** T001, T019, T022 and T023 are process tasks (baseline, README, gate commands, PR) with no single requirement. None is a defect.

**Metrics:**

- Total requirements: 15 (10 FR + 5 SC)
- Total tasks: 23
- Coverage: 15/15 (100%)
- Ambiguity count: 2 (U1, A1)
- Duplication count: 0
- Critical issues: 0 (High 1, Medium 3, Low 3)

## Resolution (2026-10-18)

| ID | Status | Change |
|----|--------|--------|
| I1 | Fixed | T002 now allows exactly one sanctioned literal rule and fails on any other. |
| U1 | Fixed | data-model.md has a new section "Chữ nội dung và chữ phụ"; T009 classifies with it and T010 applies it. |
| C1 | Fixed | spec.md edge case and Assumptions reworded for page zoom and px units; quickstart scenario 8 is now "phóng to trang"; T021 runs it. |
| E1 | Fixed | T001 starts with `npm ci` and names `NODE_PATH` and `PLAYWRIGHT_BROWSERS_PATH`. |
| I2 | Fixed | T001 takes the baseline on this branch before any CSS change. |
| I3 | Accepted | Heading contrast inside spec documents is left as is; revisit when T009 measures. |
| A1 | Accepted | iOS verification stays a manual check, disclosed in the PR (T016). |

While fixing U1 a related problem surfaced in the old T010: raising a selector to 16px by changing the token on its base rule would also change its desktop size and break SC-002. T010 and contracts/type-scale.md (rule 6) now require a phone-only override inside the `@media (max-width: 760px)` block instead.
