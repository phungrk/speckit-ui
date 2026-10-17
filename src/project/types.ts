// Shape of a real Spec Kit project as read from GitHub by server/github.ts.
import type { Story } from '../types';

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
