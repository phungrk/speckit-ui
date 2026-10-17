// Gate approvals (one GitHub issue per spec) and PR tracking across the root repo and its submodules.
// Shared by the server and the static build; the HTTP handlers live in routes.ts.
import { GATE_NAME, blockedReason, blockingGates, canApprove, gateChecks, issueTitle, newIssueBody, parseIssueBody, withGates } from '../src/project/gates.ts';
import { phaseStatus } from '../src/project/status.ts';
import { GATE_KEYS, type GateIssue, type GateKey, type Project, type SpecFeature, type SpecPR, type TrackedRepo, type Tracking } from '../src/project/types.ts';
import { gh, json, pool, remember, type Source } from './github.ts';

const TTL_MS = 30_000;
const LABEL = 'speckit';

interface GhIssue { number: number; html_url: string; state: 'open' | 'closed'; body: string | null; updated_at?: string; pull_request?: unknown }
interface GhPull { number: number; title: string; html_url: string; state: 'open' | 'closed'; draft?: boolean; merged_at: string | null; merge_commit_sha: string | null; body: string | null; head: { ref: string } }

const root = (src: Source) => `${src.owner}/${src.repo}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Root repo first, then submodules in merge order. */
export function trackedRepos(src: Source, project: Pick<Project, 'submodules'>): TrackedRepo[] {
  return [
    { repo: root(src), path: null, pointer: null },
    ...project.submodules.flatMap(m => (m.repo ? [{ repo: m.repo, path: m.path, pointer: m.sha }] : []))
  ];
}

/** A PR belongs to a spec when its branch contains the spec slug or its description links the spec folder. */
export const prMatches = (pr: Pick<GhPull, 'head' | 'body' | 'title'>, slug: string) =>
  pr.head.ref.includes(slug) || (pr.body || '').includes(`specs/${slug}`) || pr.title.includes(`specs/${slug}`);

// Whether a submodule pointer already contains a merge commit never changes, so cache it for good.
const bumpCache = new Map<string, boolean | null>();
async function isBumped(src: Source, repo: string, merge: string, pointer: string): Promise<boolean | null> {
  const key = `${src.identity ?? ''}|${repo}@${merge}...${pointer}`;
  if (bumpCache.has(key)) return bumpCache.get(key)!;
  let v: boolean | null;
  try {
    const cmp = await json<{ status: string }>(src, `/repos/${repo}/compare/${merge}...${pointer}`);
    v = cmp.status === 'ahead' || cmp.status === 'identical';
    bumpCache.set(key, v);
  } catch {
    v = null; // unknown; retry next load
  }
  return v;
}

async function whoAmI(src: Source): Promise<string | null> {
  if (!src.token) return null;
  try { return (await json<{ login: string }>(src, '/user')).login; } catch { return null; }
}

async function listIssues(src: Source): Promise<GhIssue[]> {
  const items = await json<GhIssue[]>(src, `/repos/${root(src)}/issues?state=all&labels=${LABEL}&per_page=100`);
  return items.filter(i => !i.pull_request);
}

const toGateIssue = (i: GhIssue): [string, GateIssue] | null => {
  const parsed = parseIssueBody(i.body || '');
  return parsed ? [parsed.slug, { number: i.number, url: i.html_url, state: i.state, gates: parsed.gates, updatedAt: i.updated_at ?? null }] : null;
};

// ---- Fresh writes beat stale lists (specs/001 R3) ----

/** How long a write is preferred over an older listed copy; longer than the 2 minutes of SC-003. */
export const RECENT_MS = 5 * 60_000;
/** identity|owner/repo|slug → the issue as our last write left it */
const recentWrites = new Map<string, { issue: GateIssue; at: number }>();
/** owner/repo|slug → tracking issue number, shared by everyone in this process so no one creates a second issue (U1). */
const knownIssues = new Map<string, number>();

const writePrefix = (src: Source) => `${src.identity ?? ''}|${root(src)}|`;

/** `tracking` with `issue` as the spec's tracking issue. Does not change its input. */
export const applyIssue = (tracking: Tracking, slug: string, issue: GateIssue): Tracking => ({ ...tracking, issues: { ...tracking.issues, [slug]: issue } });

/** Keep whichever copy GitHub updated last; forget writes the list has caught up with. */
function mergeRecent(src: Source, listed: Record<string, GateIssue>): Record<string, GateIssue> {
  const out = { ...listed };
  const prefix = writePrefix(src);
  for (const [k, w] of recentWrites) {
    if (!k.startsWith(prefix)) continue;
    const slug = k.slice(prefix.length);
    const have = out[slug];
    if (Date.now() - w.at > RECENT_MS || (have && (have.updatedAt ?? '') >= (w.issue.updatedAt ?? ''))) recentWrites.delete(k);
    else out[slug] = w.issue;
  }
  return out;
}

export async function loadTracking(src: Source, project: Project): Promise<Tracking> {
  const repos = trackedRepos(src, project);
  const warnings: string[] = [];
  const [user, issues, pulls] = await Promise.all([
    whoAmI(src),
    listIssues(src).catch(e => { warnings.push(`Could not list issues in ${root(src)}: ${e instanceof Error ? e.message : e}`); return [] as GhIssue[]; }),
    pool(repos, 4, r => json<GhPull[]>(src, `/repos/${r.repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`)
      .catch(e => { warnings.push(`Could not list PRs in ${r.repo}: ${e instanceof Error ? e.message : e}`); return [] as GhPull[]; }))
  ]);

  const prs: Record<string, SpecPR[]> = {};
  for (const f of project.specs) {
    prs[f.slug] = await Promise.all(repos.flatMap((r, i) => pulls[i].filter(p => prMatches(p, f.slug)).map(async p => {
      const state: SpecPR['state'] = p.merged_at ? 'merged' : p.state === 'closed' ? 'closed' : p.draft ? 'draft' : 'open';
      // A spec on a feat/ branch is checked against that branch's own submodule pointers (specs/003 C1).
      const pointer = r.path ? (f.variants?.[0]?.pointers?.[r.path] ?? r.pointer) : r.pointer;
      const bumped = state === 'merged' && r.path && pointer && p.merge_commit_sha ? await isBumped(src, r.repo, p.merge_commit_sha, pointer) : null;
      return { repo: r.repo, number: p.number, title: p.title, url: p.html_url, state, mergedAt: p.merged_at, headRef: p.head.ref, bumped };
    })));
  }

  return {
    fetchedAt: new Date().toISOString(),
    user,
    repos,
    issues: mergeRecent(src, Object.fromEntries(issues.flatMap(i => {
      const e = toGateIssue(i);
      if (e) knownIssues.set(`${root(src)}|${e[0]}`, e[1].number);
      return e ? [e] : [];
    }))),
    prs,
    warnings
  };
}

const repoPrefix = (src: Source) => `${src.identity ?? ''}|${root(src)}@`;
const trackings = new Map<string, { tracking: Tracking; at: number }>();

/** Forget all tracking data (Disconnect, Sign out). */
export function clearTrackingCache() {
  trackings.clear();
  bumpCache.clear();
  recentWrites.clear();
  knownIssues.clear();
}

export async function getTracking(src: Source, project: Project, refresh = false): Promise<Tracking> {
  const key = repoPrefix(src) + project.sha;
  const hit = trackings.get(key);
  if (!refresh && hit && Date.now() - hit.at < TTL_MS) return hit.tracking;
  const tracking = await loadTracking(src, project);
  remember(trackings, key, { tracking, at: Date.now() });
  return tracking;
}

export type GateAction = 'approve' | 'changes' | 'reopen';

export class GateRefused extends Error {}

export interface GateDecision {
  issue: GateIssue;
  /** The gate was already in the requested state: nothing was written. */
  unchanged: boolean;
  /** Tracking with this issue applied; no second read from GitHub. */
  tracking: Tracking;
}

// One decision at a time per spec, so a second click or tab sees the first one's result (R4).
const locks = new Map<string, Promise<unknown>>();
async function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(fn);
  locks.set(key, run);
  try { return await run; } finally { if (locks.get(key) === run) locks.delete(key); }
}

const asGateIssue = (i: GhIssue, slug: string): GateIssue => {
  const e = toGateIssue(i);
  return e && e[0] === slug ? e[1] : { number: i.number, url: i.html_url, state: i.state, gates: {}, updatedAt: i.updated_at ?? null };
};

/** Remember a write so lists that lag behind it can't undo it, and cache the result. */
function settle(src: Source, project: Project, tracking: Tracking, slug: string, issue: GateIssue): Tracking {
  recentWrites.set(writePrefix(src) + slug, { issue, at: Date.now() });
  knownIssues.set(`${root(src)}|${slug}`, issue.number);
  const next = applyIssue(tracking, slug, issue);
  for (const k of [...trackings.keys()]) if (k.startsWith(repoPrefix(src))) trackings.delete(k);
  remember(trackings, repoPrefix(src) + project.sha, { tracking: next, at: Date.now() });
  return next;
}

/**
 * Record a gate decision in the spec's tracking issue, creating the issue if needed.
 * Idempotent: a gate already in the requested state is reported as `unchanged` and nothing is written.
 */
export function decideGate(src: Source, project: Project, f: SpecFeature, gate: GateKey, action: GateAction, note: string): Promise<GateDecision> {
  return oneAtATime(`${root(src)}|${f.slug}`, () => decide(src, project, f, gate, action, note));
}

async function decide(src: Source, shown: Project, f: SpecFeature, gate: GateKey, action: GateAction, note: string): Promise<GateDecision> {
  // Decide on the version being looked at, which may be another branch's (specs/003 R6).
  const project = shown.specs.includes(f) ? shown : { ...shown, specs: shown.specs.map(s => (s.slug === f.slug ? f : s)) };
  const tracking = await getTracking(src, project, true);
  const base = `/repos/${root(src)}`;
  const specUrl = `https://github.com/${root(src)}/tree/${f.branch ?? project.ref}/specs/${f.slug}`;
  const known = tracking.issues[f.slug]?.number ?? knownIssues.get(`${root(src)}|${f.slug}`);
  // Read the issue itself: unlike the list, it is never behind.
  let issue = known ? await json<GhIssue>(src, `${base}/issues/${known}`) : null;

  // Already approved (or already reopened) by anyone: report it instead of writing again (FR-007).
  if (issue && action !== 'changes') {
    const current = parseIssueBody(issue.body || '')?.gates[gate];
    if (action === 'approve' ? current?.approved : !current?.approved) {
      const gi = asGateIssue(issue, f.slug);
      return { issue: gi, unchanged: true, tracking: settle(src, project, tracking, f.slug, gi) };
    }
  }

  // The checks run again right before any write (constitution III).
  const checks = gateChecks(f, gate, tracking.prs[f.slug] || [], tracking);
  // A gate can't be approved past an earlier unapproved one, checked on the issue just read (specs/004 FR-005).
  if (action === 'approve') {
    const blocker = blockingGates(phaseStatus(project, f), issue ? { gates: parseIssueBody(issue.body || '')?.gates ?? {} } : null, project.approvalGates)[GATE_KEYS.indexOf(gate) + 1];
    if (blocker) throw new GateRefused(blockedReason(blocker));
  }
  if (action === 'approve' && !canApprove(checks)) {
    throw new GateRefused(`${GATE_NAME[gate]} can't be approved yet: ${checks.filter(c => !c.ok && c.required).map(c => c.label).join('; ')}.`);
  }
  if (!issue) {
    if (action !== 'approve') throw new GateRefused('There is no tracking issue for this spec yet. Approve a gate to create it.');
    issue = await (await gh(src, `${base}/issues`, false, { method: 'POST', body: { title: issueTitle(f), body: newIssueBody(f.slug, specUrl), labels: [LABEL] } })).json() as GhIssue;
    knownIssues.set(`${root(src)}|${f.slug}`, issue.number);
  }

  // Re-read the gates from the fresh body so edits made on GitHub are kept.
  const gates = parseIssueBody(issue.body || '')?.gates ?? {};
  const by = tracking.user ?? undefined;
  gates[gate] = action === 'approve' ? { approved: true, ...(by ? { by } : {}), at: today() } : { approved: false };
  const close = action === 'approve' && gate === 'implement';
  const reopen = action !== 'approve' && issue.state === 'closed';
  const updated = await (await gh(src, `${base}/issues/${issue.number}`, false, {
    method: 'PATCH',
    body: { body: withGates(issue.body || newIssueBody(f.slug, specUrl), gates), ...(close ? { state: 'closed', state_reason: 'completed' } : reopen ? { state: 'open' } : {}) }
  })).json() as GhIssue;
  // The gate is decided on GitHub from here on, even if the comment below fails (contract I1).
  const result = asGateIssue(updated, f.slug);
  const next = settle(src, project, tracking, f.slug, result);

  const who = by ? `@${by}` : 'speckit-ui';
  const checkList = checks.map(c => `- [${c.ok ? 'x' : ' '}] ${c.label}${!c.ok && !c.required ? ' (warning)' : ''}`).join('\n');
  const text = action === 'approve'
    ? `✅ **${GATE_NAME[gate]}** approved by ${who} via speckit-ui at \`${project.sha.slice(0, 7)}\`.\n\n${checkList}${note ? `\n\n> ${note}` : ''}`
    : action === 'changes'
      ? `↩️ Changes requested on **${GATE_NAME[gate]}** by ${who}.${note ? `\n\n> ${note}` : ''}`
      : `↺ **${GATE_NAME[gate]}** reopened by ${who}.${note ? `\n\n> ${note}` : ''}`;
  await gh(src, `${base}/issues/${issue.number}/comments`, false, { method: 'POST', body: { body: text } });
  return { issue: result, unchanged: false, tracking: next };
}
