// Gate approvals (one GitHub issue per spec) and PR tracking across the root repo and its submodules.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GATE_NAME, canApprove, gateChecks, issueTitle, newIssueBody, parseIssueBody, withGates } from '../src/project/gates.ts';
import { GATE_KEYS, type GateIssue, type GateKey, type Project, type SpecFeature, type SpecPR, type TrackedRepo, type Tracking, type TrackingResponse } from '../src/project/types.ts';
import { GitHubError, getProject, gh, json, pool, sourceFromEnv, type Source } from './github.ts';

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
  const key = `${repo}@${merge}...${pointer}`;
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

let cache: { key: string; tracking: Tracking; at: number } | null = null;

export async function getTracking(src: Source, project: Project, refresh = false): Promise<Tracking> {
  const key = `${root(src)}@${project.sha}`;
  if (!refresh && cache?.key === key && Date.now() - cache.at < TTL_MS) return cache.tracking;
  const tracking = await loadTracking(src, project);
  cache = { key, tracking, at: Date.now() };
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

  cache = null;
  return toGateIssue(updated)?.[1] ?? { number: updated.number, url: updated.html_url, state: updated.state, gates };
}

const send = (res: ServerResponse, status: number, data: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

export async function handleTracking(req: IncomingMessage, res: ServerResponse) {
  const src = sourceFromEnv();
  if (!src) return send(res, 200, { configured: false } satisfies TrackingResponse);
  try {
    const refresh = new URL(req.url || '/', 'http://x').searchParams.has('refresh');
    const project = await getProject(src, refresh);
    return send(res, 200, { configured: true, tracking: await getTracking(src, project, refresh) } satisfies TrackingResponse);
  } catch (e) {
    if (!(e instanceof GitHubError)) console.error('Tracking load failed:', e);
    return send(res, 502, { configured: true, error: e instanceof Error ? e.message : 'Could not load tracking.' } satisfies TrackingResponse);
  }
}

/** Writes are only accepted from this app's own pages (blocks cross-site form posts and fetches). */
export function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return (req.headers['sec-fetch-site'] ?? 'same-origin') === 'same-origin';
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export async function handleGate(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!sameOrigin(req) || !(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 403, { error: 'Forbidden.' });
  const src = sourceFromEnv();
  if (!src) return send(res, 400, { error: 'GITHUB_REPO is not set.' });
  let body: { slug?: unknown; gate?: unknown; action?: unknown; note?: unknown };
  try {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 8_000) throw new Error('too large'); }
    body = JSON.parse(raw);
  } catch { return send(res, 400, { error: 'Body must be JSON.' }); }
  const { slug, gate, action, note } = body;
  if (typeof slug !== 'string' || !GATE_KEYS.includes(gate as GateKey) || !['approve', 'changes', 'reopen'].includes(action as string) || (note !== undefined && typeof note !== 'string')) {
    return send(res, 400, { error: 'Expected { slug, gate, action: approve | changes | reopen, note? }.' });
  }
  try {
    const project = await getProject(src);
    const f = project.specs.find(x => x.slug === slug);
    if (!f) return send(res, 404, { error: `No spec ${slug} at ${project.sha.slice(0, 7)}.` });
    const issue = await decideGate(src, project, f, gate as GateKey, action as GateAction, ((note as string) || '').trim().slice(0, 2000));
    return send(res, 200, { issue, tracking: await getTracking(src, project, true) });
  } catch (e) {
    if (e instanceof GateRefused) return send(res, 409, { error: e.message });
    if (!(e instanceof GitHubError)) console.error('Gate update failed:', e);
    return send(res, e instanceof GitHubError ? 502 : 500, { error: e instanceof Error ? e.message : 'Could not update the gate.' });
  }
}
