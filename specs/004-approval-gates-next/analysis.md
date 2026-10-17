## Specification Analysis Report: 004-approval-gates-next

Artifacts checked: `spec.md`, `plan.md`, `tasks.md` (T001–T030), `research.md`, `data-model.md`, `contracts/ui-api.md`, `contracts/gate-check.md`, `quickstart.md`, and constitution v1.1.0.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | HIGH | tasks.md T014; `src/project/GatePanel.tsx:86` | For a step with no output, the Gate panel shows "Plan has no output yet. Run /speckit-plan first." T014 says to show "Approve K first." *instead of the checks message*, but this line is a different message. As written, a blocked step can still suggest `/speckit-plan` in the Gate panel, which breaks SC-001 ("100% … ở mọi nơi có gợi ý lệnh"). | In T014, say that when `blockedBy` is set, both the checks warning and the "has no output yet. Run … first" line are replaced by "Approve K first.". Add a test or E2E assertion that no `/speckit-<k>` text for a blocked step appears anywhere on the page (T027 already checks copyable text; widen it to visible text). |
| I1 | Inconsistency | MEDIUM | spec.md FR-001; research.md R1; data-model.md | FR-001 says a step is locked when "cổng của bước đã làm gần nhất trước nó" is unapproved. R1 and the data model use "the first unapproved gate among *all* earlier done steps". The two agree when gates are approved in order, but differ when a box is ticked out of order on GitHub. FR-007 requires the hook to match FR-001 exactly. | Update FR-001 to the R1 wording, so spec, plan and hook state one rule. |
| U2 | Underspecification | MEDIUM | spec.md FR-008; research.md R5; contracts/gate-check.md | A bypass is "ghi lại" by writing to stdout on `UserPromptSubmit`, which is added to the session context. On the `PreToolUse` path (Claude calls the skill), stdout with exit 0 is not added to the context, so a bypass there leaves no record. | Define how a bypass is recorded on both paths. For example, on `PreToolUse` return JSON `permissionDecision: "allow"` with `permissionDecisionReason` naming the bypass, or append a line to the session transcript via stderr plus exit 0. Add it to T017 and T019. |
| G1 | Coverage | MEDIUM | spec.md FR-010 (spec 003 part); tasks.md | FR-010 requires the same rule for specs on unmerged branches. No task tests a branch version: `blockingGates` on the version shown, and `decide()` refusing on a branch version. | Add a case to T009 (or `tests/branches.test.ts`) that approves Plan on a `feat/` version with Specify unapproved and expects 409. Add a `feat/` spec to the T027 E2E. |
| D1 | Dependency | MEDIUM | tasks.md T020; PR #12 | T020 reuses "the same build-commit helper used for `__BUILD__`". That helper exists only on `fix/build-info-pinned-branch` (PR #12, not merged). `main` and this branch have no `__BUILD__`. | Merge PR #12 first and rebase 004, or let T020 add the helper itself. |
| G2 | Coverage | MEDIUM | tasks.md T022; `.github/workflows` | T022 runs the built bundle "after `npm run build`" and skips when `dist/` is absent. The Pages workflow runs `npm test` before `npm run build`, so CI always skips it and the shipped `speckit-gate.mjs` is never executed in CI. | Have T022 build the hook itself, or move the smoke run after the build in the workflow. One option is a `test:hook` step after `npm run build`, added to the constitution V gate list. |
| U3 | Underspecification | MEDIUM | spec.md Assumptions; research.md R2 | Per the Claude Code docs, multi-repo cloud sessions read only plugin settings from the repo, not `hooks`. In such a session the commands are not blocked, even with the hook installed. Neither the spec nor the README task mentions this. | Add it as an edge case or assumption in spec.md, and to T025 (README). The app hint (T021) can't detect this; that is acceptable if documented. |
| A1 | Ambiguity | LOW | spec.md SC-003; research.md R3 | SC-003 says "mọi lệnh từ `/speckit-clarify` tới `/speckit-implement`". R3 leaves out `checklist`, `converge` and `taskstoissues`, which also run in that range. | Name the five gated commands in SC-003. |
| T1 | Terminology | LOW | spec.md ("bước kiểm tra"); plan/tasks ("hook", "gate check", `speckit-gate`) | The same thing has three names. | In spec.md Key Entities, add: Bước kiểm tra = Claude Code hook `speckit-gate.mjs` ("gate check" in the UI). |
| C1 | Constitution (II, docs) | LOW | spec.md; constitution II | II asks features that need permissions to name them in the spec. The hook needs Issues read on the project repo through the user's own `gh`/token. That is not new for the app token, and it is named in plan.md, but not in spec.md. | Add one line to spec.md Assumptions: the hook needs Issues read. |
| S1 | Style | LOW | spec.md Success Criteria | SC-005 is listed before SC-004. | Reorder. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 lock rule | Yes | T004, T006 | See I1 |
| FR-002 locked state + reason | Yes | T012, T013 | |
| FR-003 no command / no copy | Yes | T012, T013, T014 | See U1 |
| FR-004 Next up only approval | Yes | T008, T011 | |
| FR-005 no out-of-order approve, recheck before write | Yes | T009, T010, T014 | |
| FR-006 "ran early" visible | Yes | T023, T024 | |
| FR-007 block in Claude Code, same rule | Yes | T017, T019, T020, T029 | |
| FR-008 can't check → stop + recorded bypass | Partial | T017, T019 | See U2 |
| FR-009 reopen re-locks | Yes | T009, T016, T027 | |
| FR-010 server = Pages, unmerged specs | Partial | T027 | See G1 |
| FR-011 on by default, per-repo off, shared config | Yes | T001, T005, T007, T019 | |
| FR-012 ship check + install guide + hint | Yes | T005, T020, T021, T025 | |
| SC-001 no blocked command anywhere | Partial | T012–T015, T027 | See U1 |
| SC-002 unlock ≤ 1 s | Yes | T016, T027 | |
| SC-003 blocked command changes no file | Yes | T017, T029 | |
| SC-004 every spec still visible | Yes | T023, T024 | |
| SC-005 install ≤ 5 min | Yes | T018, T025 | Not timed; docs and `install` only |

**Constitution Alignment Issues:** None at MUST level.
- I: no new write; the app doesn't write the hook into the repo.
- II: no new destination; CSP unchanged.
- III: shared `status.ts` and `gates.ts`.
- IV: existing classes only; demo parity in T028.
- V: unit tests for rule, refusal and hook.
- VII: Complexity Tracking filled.

C1 is a documentation nit.

**Unmapped Tasks:** None.
- T002 and T003 are enabling refactors for FR-001 and FR-007.
- T026 updates spec 001's Non-Goal, as the spec's Assumptions require.
- T028 and T030 are constitution IV and V gates.

**Metrics:**

- Total Requirements: 17 (12 FR + 5 SC)
- Total Tasks: 30
- Coverage % (requirements with ≥1 task): 100%. 3 are partial: FR-008, FR-010, SC-001.
- Ambiguity Count: 1 (A1)
- Duplication Count: 0
- Critical Issues Count: 0

### Next Actions

- No CRITICAL issues. Fix U1 before `/speckit-implement`, because it decides whether SC-001 can pass. I1, U2, G1, D1, G2 and U3 are small edits to spec.md and tasks.md.
- Suggested order:
  1. Merge PR #12, or let T020 own the helper (D1).
  2. Edit spec.md for I1, U3, A1, T1, C1 and S1.
  3. Edit tasks.md for U1, U2, G1 and G2.
  4. `/speckit-implement`.
