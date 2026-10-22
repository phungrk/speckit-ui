// Shape of a real Spec Kit project as read from GitHub by server/github.ts.
import type { Story } from '../types.ts';

export interface Principle {
  /** Roman numeral as written in the heading, e.g. "IV". */
  num: string;
  title: string;
  /** Markdown body under the heading. */
  body: string;
}

export interface Constitution {
  title: string;
  version: string | null;
  ratified: string | null;
  amended: string | null;
  principles: Principle[];
  raw: string;
}

export interface SpecRequirement {
  id: string;
  text: string;
  /** Text of a [NEEDS CLARIFICATION: …] marker, if any. */
  clarification?: string;
}

export interface ClarifyItem { session: string; q: string; a: string }

export interface ParsedSpec {
  title: string;
  fields: Record<string, string>;
  stories: Story[];
  frs: SpecRequirement[];
  sc: SpecRequirement[];
  /** Count of [NEEDS CLARIFICATION] markers anywhere in spec.md. */
  needsClarification: number;
  clarifications: ClarifyItem[];
  raw: string;
}

export interface ParsedPlan {
  summary: string;
  context: [string, string][];
  /** Constitution Check items: [label, passed]. */
  checks: [string, boolean][];
  raw: string;
}

export interface LiveTask {
  id: string;
  done: boolean;
  parallel: boolean;
  story?: string;
  text: string;
  /** First file path mentioned in backticks. */
  path?: string;
}

export interface TaskPhase { name: string; tasks: LiveTask[] }

export interface AnalysisFinding {
  id: string;
  category: string;
  severity: string;
  location: string;
  summary: string;
  recommendation: string;
}

export interface ParsedAnalysis { findings: AnalysisFinding[]; raw: string }

export interface ChecklistSummary { name: string; done: number; total: number }

/** Highlight colours (specs/010-spec-annotations): y Key, b Question, p Issue, o Change; n is a plain comment with no category (specs/012). */
export type HighlightColor = 'y' | 'b' | 'p' | 'o' | 'n';

/** GitHub login (server, Pages), a typed name (local) or a sample person (demo). */
export type HighlightAuthor = { login: string } | { name: string; local: true } | { name: string; demo: true };

/** An emoji someone put on a comment or a reply (specs/011): one entry per (emoji, person). */
export interface Reaction { emoji: string; author: HighlightAuthor }

/** An answer under a comment (specs/011). `createdAt` and `author` are set by whoever saves it, not by the client. */
export interface Reply {
  id: string;
  author: HighlightAuthor;
  createdAt: string;
  /** Set once the reply was edited. */
  editedAt?: string;
  text: string;
  reactions?: Reaction[];
}

/** One highlight in specs/NNN-slug/highlights.json (data-model.md). */
export interface Highlight {
  id: string;
  phase: string;
  doc: string;
  quote: string;
  prefix: string;
  suffix: string;
  startHint: number;
  docSha: string | null;
  color: HighlightColor;
  note: string;
  author: HighlightAuthor;
  createdAt: string;
  updatedAt: string;
  /** Answers to the comment, oldest first (specs/011). Absent means none. */
  replies?: Reply[];
  /** Emoji on the comment itself (specs/011). Absent means none. */
  reactions?: Reaction[];
}

export type HighlightChange =
  | { type: 'add'; highlight: Highlight }
  | { type: 'update'; id: string; color?: HighlightColor; note?: string }
  | { type: 'remove'; id: string }
  // Specs/011. A reply is added by anyone who can save; its author and time are set where it is saved. Editing and
  // removing are the writer's alone. `react` sets (on) or clears (off) the saver's emoji, on a comment or on one reply.
  | { type: 'reply'; id: string; reply: { id: string; text: string } }
  | { type: 'reply-edit'; id: string; replyId: string; text: string }
  | { type: 'reply-remove'; id: string; replyId: string }
  | { type: 'react'; id: string; replyId?: string; emoji: string; on: boolean };

/** `version` is 1 while no highlight has replies or emoji, 2 once one has (specs/011 R1), so an older build refuses to write it. */
export interface HighlightsFile { version: 1 | 2; highlights: Highlight[] }

/** The highlights of one spec version, as read with it. `error` blocks writing (FR-014). */
export interface SpecHighlights { items: Highlight[]; error: string | null }

export interface SpecFeature {
  /** "001" */
  id: string;
  /** "001-rename-vendor-tab" */
  slug: string;
  title: string;
  /** File paths relative to the spec directory, e.g. "plan.md", "contracts/api.yaml". */
  files: string[];
  spec: ParsedSpec | null;
  plan: ParsedPlan | null;
  tasks: TaskPhase[] | null;
  analysis: ParsedAnalysis | null;
  checklists: ChecklistSummary[];
  /** Raw markdown of supporting docs that exist: research.md, data-model.md, quickstart.md. */
  docs: Record<string, string>;
  /** Branch this version was read from; null for the default branch (specs/003). */
  branch: string | null;
  /** Commit of this version, for file links. */
  sha: string;
  /** Read from a feat/ branch and different from the default branch. */
  unmerged: boolean;
  /** Every version of this slug; the first is the one shown. */
  variants: SpecVariant[];
  /** specs/NNN/highlights.json of this version (specs/010-spec-annotations). */
  highlights?: SpecHighlights;
  /** Blob sha of each file, for a highlight's docSha (server and Pages only). */
  blobs?: Record<string, string>;
}

export interface Project {
  repo: string;
  ref: string;
  sha: string;
  committedAt: string | null;
  fetchedAt: string;
  /** How commands are invoked, e.g. "/speckit-" (Claude skills) or "/speckit.". */
  commandPrefix: string;
  constitution: Constitution | null;
  specs: SpecFeature[];
  /** Submodules from .gitmodules, with the commit each points at. */
  submodules: Submodule[];
  /** Files that were listed but could not be read. */
  warnings: string[];
  /** feat/ branches read for unmerged specs; empty when a branch is pinned (specs/003). */
  branches: BranchInfo[];
  /** Branches left out by the 30-branch limit. */
  skippedBranches: number;
  /** Branch name prefixes read, from .specify/speckit-ui.json (default ["feat/"]). */
  branchPrefixes: string[];
  /** `ref` was chosen in Settings or GITHUB_REF, so feat/ branches are not read (FR-010). */
  pinned: boolean;
  /**
   * Whether GitHub says the signed-in user may write to the repository (`permissions.push`); null when it does not say,
   * or when a branch is pinned (specs/012 FR-016). Kept out of the cached project: see `getProject`.
   */
  canWrite?: boolean | null;
  /** Steps after an unapproved gate are locked unless the repo sets "approvalGates": "off" (specs/004). */
  approvalGates: 'block' | 'off';
  /** Whether the repo has the Claude Code gate check (.claude/hooks/speckit-gate.mjs) installed (specs/004 R7). */
  gateCheck: 'installed' | 'missing';
}

/** One version of a spec folder, shared by every branch where the folder is identical. */
export interface SpecVariant {
  /** Branches holding this exact version; the default branch's name when it is on it. */
  branches: string[];
  /** Git tree SHA of specs/NNN-slug in this version. */
  treeSha: string;
  /** Commit of the first branch in `branches`. */
  sha: string;
  onDefault: boolean;
  /** Steps done (Specify to Implement); the version that went furthest is shown first. */
  stage: number;
  committedAt: string | null;
  /** Submodule pointers (path → commit) on this version's branch, for the Implement gate. */
  pointers: Record<string, string>;
}

export interface BranchInfo {
  name: string;
  sha: string;
  specsTreeSha: string | null;
  /** Spec folders on this branch that differ from the default branch. */
  unmergedSlugs: string[];
  error: string | null;
}

export type ProjectResponse =
  | { configured: false }
  | { configured: true; project: Project }
  | { configured: true; error: string };

// ---- Step 2: gates recorded in GitHub issues, and PR tracking ----

export type GateKey = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'implement';
export const GATE_KEYS: GateKey[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement'];

export interface GateApproval { approved: boolean; by?: string; at?: string }

export interface GateIssue {
  number: number;
  url: string;
  state: 'open' | 'closed';
  gates: Partial<Record<GateKey, GateApproval>>;
  /** GitHub's updated_at; the newer copy wins when a fresh write meets a stale list. */
  updatedAt: string | null;
}

export interface Submodule { path: string; repo: string | null; sha: string | null }

export interface TrackedRepo {
  /** owner/name */
  repo: string;
  /** Submodule path in the root repo; null for the root repo itself. */
  path: string | null;
  /** Commit the root repo's submodule pointer is at. */
  pointer: string | null;
}

export interface SpecPR {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: 'open' | 'draft' | 'merged' | 'closed';
  mergedAt: string | null;
  headRef: string;
  /** For merged PRs in a submodule repo: whether the root repo's pointer includes the merge. */
  bumped: boolean | null;
}

export interface Tracking {
  fetchedAt: string;
  /** Login of the token's owner, recorded as the approver. */
  user: string | null;
  /** Repos in merge order. */
  repos: TrackedRepo[];
  issues: Record<string, GateIssue>;
  prs: Record<string, SpecPR[]>;
  warnings: string[];
}

export type TrackingResponse =
  | { configured: false }
  | { configured: true; tracking: Tracking }
  | { configured: true; error: string };

// ---- Several repositories per session (specs/002-multi-repo-workspace) ----

/** Who is using the app. Every read and write uses this person's own GitHub access. */
export interface CurrentUser {
  login: string;
  /** Pages: token typed in the browser · signin: server sign-in · token: local .env.local token */
  mode: 'pages' | 'signin' | 'token';
  avatarUrl: string | null;
}

/** A repository the current user can read. */
export interface AccessibleRepo {
  /** owner/name */
  fullName: string;
  private: boolean;
  defaultBranch: string;
  pushedAt: string;
  /** null until checked */
  speckit: boolean | null;
  pinned: boolean;
}

export interface RepoListing {
  repos: AccessibleRepo[];
  /** The 1,000-repo cap was reached. */
  truncated: boolean;
  fetchedAt: string;
}

/** One thing to do next on the overview of pinned repos. */
export interface OverviewItem {
  repo: string;
  slug: string;
  /** Branch of an unmerged spec; null on the default branch. */
  branch: string | null;
  title: string;
  kind: 'approve' | 'run' | 'implement';
  label: string;
  /** Step index 0–6 to open. */
  step: number;
}

export interface SessionResponse {
  mode: 'pages' | 'signin' | 'token' | 'demo';
  user: { login: string; avatarUrl: string | null } | null;
  defaultRepo?: string | null;
  error?: string;
}

export interface DetectTarget { fullName: string; pushedAt?: string | null }

export interface DetectResult {
  results: Record<string, boolean>;
  /** Repos that could not be checked, with the reason. */
  errors: Record<string, string>;
}
