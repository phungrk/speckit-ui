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
  /** Files that were listed but could not be read. */
  warnings: string[];
}

export type ProjectResponse =
  | { configured: false }
  | { configured: true; project: Project }
  | { configured: true; error: string };
