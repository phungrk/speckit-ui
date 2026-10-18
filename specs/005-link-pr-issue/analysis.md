## Specification Analysis Report: 005-link-pr-issue

Artifacts checked: `spec.md`, `plan.md`, `tasks.md` (T001–T028), `research.md`, `data-model.md`, `contracts/pr-links.md`, `quickstart.md`, and constitution v1.1.0. Cross-checked against the code on `feat/005-link-pr-issue`.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| I1 | Inconsistency | HIGH | spec.md edge case "Một spec có nhiều PR" and FR-004; research.md R1; tasks.md T005, T013, T015 | The spec says that with several PRs "only the last PR closes the issue". The design makes every root-repo PR use `Closes #N`: `linkStatus` treats `mentions` on a root PR as an error and the hook blocks a root PR without `Closes`. A spec with a docs PR and a code PR in the root repo has its issue closed by the first merge. FR-004 separates root from submodule but does not say which root PR is last. | Decide the rule for several root-repo PRs, then align `linkStatus`, T004–T005, T013, T015. |
| I2 | Inconsistency | MEDIUM | tasks.md T015 and Implementation Strategy; this branch | Tasks require `var(--fs-N)` for new font sizes (spec 006), but this branch has no type scale (`--fs-13` is absent from `modernist.css`, `tests/typescale.test.ts` does not exist) and PR #18 is still open. | Add the dependency to T001: merge #18 first, then `origin/main` into this branch before T015. |
| C1 | Coverage Gap | MEDIUM | spec.md FR-007; tasks.md T006, T010 | FR-007 (spec on an unmerged branch) has no test. | Add a case to T006 and to T010. |
| U1 | Underspecification | MEDIUM | tasks.md T012, T010; research.md R4 | R4 says the head defaults to the current branch and `--fill` or no body means an empty body, but T012 does not. Most `gh pr create` calls have no `--head`, so the hook would not find the spec and would pass silently, against SC-001. | Add both to T012 and add the cases to T010. |
| A1 | Ambiguity | LOW | plan.md Performance Goals; tasks.md T010 | The goal "under 100 ms" for non-PR Bash commands is not measured by any test. | Reword the goal to "exits at once, reads no config, calls no GitHub" and test that. |
| T1 | Terminology | LOW | research.md R2; tasks.md T004–T005 | `linkKind` has two different signatures in the research and the tasks. | Align research R2 with the tasks. |
| C2 | Coverage Gap | LOW | spec.md SC-002, SC-003 | Both criteria describe GitHub's own behaviour and cannot be tested in the sandbox. | Accept; say so in the PR. |
| G1 | Governance | LOW | tasks.md T019; constitution Governance | `CLAUDE.md` gets a rule that the constitution does not have. | Accept; T019 already says not to call it part of the constitution. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 link line in the PR description | Yes | T010–T014, T019 | |
| FR-002 no issue: do not block, remind | Yes | T013, T015 | |
| FR-003 app shows linked or not, and how to add | Yes | T005, T007, T015, T017 | |
| FR-004 merge closes the issue (root versus submodule) | Partial | T005, T018, T023 | See I1 |
| FR-005 a PR closed without merge does not close | Yes | T021 | GitHub behaviour |
| FR-006 closing is not approving Implement | Yes | T020, T022 | |
| FR-007 unmerged-branch specs, cross-repo links | Yes (after C1) | T006, T010, T013 | |
| FR-008 PRs by Claude Code and by hand | Yes | T010–T015, T019 | |
| SC-001 | Yes | T010, T025 | Sessions without hooks rely on the `CLAUDE.md` rule |
| SC-002 | Docs only | T018, T023 | See C2 |
| SC-003 | Yes | T021 | See C2 |
| SC-004 | Yes | T015, T024 | |

**Constitution Alignment Issues:** None. I: no new write. II: no new destination; the hook reads local files and the tracking issue. III: the shared logic sits in `src/project/gates.ts` with no Node imports. IV: existing classes, 390 px check (T024), demo comparison (T026). V: tests for link detection, `loadTracking`, the Implement warning and every hook branch. VI: Copilot unchanged. VII: GitHub's closing keywords instead of an API. The spec has a Non-Goals section.

**Unmapped Tasks:** T001, T027 and T028 are process tasks; T026 maps to principle IV. None is a defect.

**Metrics:**

- Total requirements: 12 (8 FR + 4 SC)
- Total tasks: 28
- Coverage: 12/12 have at least one task; FR-004 only partly until I1 is decided
- Ambiguity count: 2 (U1, A1)
- Duplication count: 0
- Critical issues: 0 (High 1, Medium 3, Low 4)

## Resolution (2026-10-18)

| ID | Status | Change |
|----|--------|--------|
| I1 | Pending | Needs a decision on the rule for several root-repo PRs. |
| I2 | Fixed | T001 now checks the type scale and says what to do when PR #18 is not merged. |
| C1 | Fixed | T006 and T010 have the unmerged-branch cases. |
| U1 | Fixed | T012 and T010 cover the default head and `--fill` / no body. |
| A1 | Fixed | plan.md Performance Goals reworded; T010 asserts that the hook exits without reading config or calling GitHub. |
| T1 | Fixed | research.md R2 now matches the signatures in the tasks. |
| C2 | Accepted | Behaviour of GitHub; to be stated in the PR. |
| G1 | Accepted | The `CLAUDE.md` rule stays additive. |
