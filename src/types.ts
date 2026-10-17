export type Role = 'Director' | 'Designer' | 'Engineer' | 'QA';
export type PhaseKey = 'constitution' | 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'implement';
export type PhaseStatus = 'done' | 'review' | 'locked';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type QaResult = 'Pass' | 'Fail';

export interface Person { name: string; ini: string }

export interface Phase {
  k: PhaseKey;
  n: string;
  cmd: string;
  file: string;
  gate: Role[];
  what: string;
}

/** Given / when / then. */
export type Acceptance = [given: string, when: string, then: string];

export interface Story {
  id: string;
  p: string;
  title: string;
  text: string;
  ac: Acceptance[];
}

/** [id, text] or, in drafts, [id, text, needsClarification]. */
export type Requirement = [id: string, text: string, needsClarification?: string];

export interface Draft {
  desc: string;
  stories: Story[];
  frs: Requirement[];
  sc: Requirement[];
  checklist: [item: string, ok: boolean][];
}

export interface Feature {
  id: string;
  slug: string;
  title: string;
  /** One entry per phase, in SK.phases order. */
  status: PhaseStatus[];
  approvals: Partial<Record<PhaseKey, Partial<Record<Role, boolean>>>>;
  summary: string;
  /** Full artifacts are loaded for this feature. */
  detailed?: boolean;
  draft?: Draft;
}

export interface Clarification {
  q: string;
  opts: string[];
  a: number;
  by: Role;
  date: string;
}

export interface Task {
  g: string;
  id: string;
  d: string;
  f: string;
  o: Role;
  /** Parallelizable. */
  p?: boolean;
  /** User story. */
  s?: string;
  isNew?: boolean;
}

export interface Finding {
  id: string;
  sev: Severity;
  cat: string;
  loc: string;
  d: string;
  /** One-line risk shown in the gate brief. */
  risk?: string;
  opts: string[];
}

export type ActivityItem = [who: Role, what: string, when: string];

export interface Workspace {
  project: string;
  people: Record<Role, Person>;
  phases: Phase[];
  constitution: { version: string; ratified: string; principles: [title: string, text: string][] };
  features: Feature[];
  spec: { created: string; stories: Story[]; frs: Requirement[]; sc: Requirement[] };
  clarify: Clarification[];
  plan: {
    context: [string, string][];
    checks: [string, string][];
    artifacts: [string, string][];
    entities: [string, string][];
  };
  tasks: Task[];
  findings: Finding[];
  activity: ActivityItem[];
}
