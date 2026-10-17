// Gate approvals (one GitHub issue per spec) and PR tracking across the root repo and its submodules.
// Shared by the server and the static build; the HTTP handlers live in routes.ts.
import { GATE_NAME, canApprove, gateChecks, issueTitle, newIssueBody, parseIssueBody, withGates } from '../src/project/gates.ts';
import type { GateIssue, GateKey, Project, SpecFeature, SpecPR, TrackedRepo, Tracking } from '../src/project/types.ts';
import { gh, json, pool, remember, type Source } from './github.ts';

const TTL_MS = 30_000;
const LABEL = 'speckit';

interface GhIssue { number: number; html_url: string; state: 'open' | 'closed'; body: string | null; pull_request?: unknown }
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
  return parsed ? [parsed.slug, { number: i.number, url: i.html_url, state: i.state, gates: parsed.gates }] : null;
};

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
      const bumped = state === 'merged' && r.path && r.pointer && p.merge_commit_sha ? await isBumped(src, r.repo, p.merge_commit_sha, r.pointer) : null;
      return { repo: r.repo, number: p.number, title: p.title, url: p.html_url, state, mergedAt: p.merged_at, headRef: p.head.ref, bumped };
    })));
  }

  return {
    fetchedAt: new Date().toISOString(),
    user,
    repos,
    issues: Object.fromEntries(issues.flatMap(i => { const e = toGateIssue(i); return e ? [e] : []; })),
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

/** Record a gate decision in the spec's tracking issue, creating the issue if needed. */
export async function decideGate(src: Source, project: Project, f: SpecFeature, gate: GateKey, action: GateAction, note: string): Promise<GateIssue> {
  const tracking = await getTracking(src, project, true);
  const checks = gateChecks(f, gate, tracking.prs[f.slug] || [], tracking);
  if (action === 'approve' && !canApprove(checks)) {
    throw new GateRefused(`${GATE_NAME[gate]} can't be approved yet: ${checks.filter(c => !c.ok && c.required).map(c => c.label).join('; ')}.`);
  }
  const base = `/repos/${root(src)}`;
  const specUrl = `https://github.com/${root(src)}/tree/${project.ref}/specs/${f.slug}`;
  let issue: GhIssue;
  const known = tracking.issues[f.slug];
  if (known) issue = await json<GhIssue>(src, `${base}/issues/${known.number}`);
  else {
    if (action !== 'approve') throw new GateRefused('There is no tracking issue for this spec yet. Approve a gate to create it.');
    issue = await (await gh(src, `${base}/issues`, false, { method: 'POST', body: { title: issueTitle(f), body: newIssueBody(f.slug, specUrl), labels: [LABEL] } })).json() as GhIssue;
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

  const who = by ? `@${by}` : 'speckit-ui';
  const checkList = checks.map(c => `- [${c.ok ? 'x' : ' '}] ${c.label}${!c.ok && !c.required ? ' (warning)' : ''}`).join('\n');
  const text = action === 'approve'
    ? `✅ **${GATE_NAME[gate]}** approved by ${who} via speckit-ui at \`${project.sha.slice(0, 7)}\`.\n\n${checkList}${note ? `\n\n> ${note}` : ''}`
    : action === 'changes'
      ? `↩️ Changes requested on **${GATE_NAME[gate]}** by ${who}.${note ? `\n\n> ${note}` : ''}`
      : `↺ **${GATE_NAME[gate]}** reopened by ${who}.${note ? `\n\n> ${note}` : ''}`;
  await gh(src, `${base}/issues/${issue.number}/comments`, false, { method: 'POST', body: { body: text } });

  // Only this user's entries for this repo are stale now.
  for (const k of [...trackings.keys()]) if (k.startsWith(repoPrefix(src))) trackings.delete(k);
  return toGateIssue(updated)?.[1] ?? { number: updated.number, url: updated.html_url, state: updated.state, gates };
}
