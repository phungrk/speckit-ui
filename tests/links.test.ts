// specs/005: PRs link to the tracking issue. Synthetic data only; GitHub is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProjectCache, loadProject, type Source } from '../server/github';
import { parseUiConfig } from '../server/parse';
import { clearTrackingCache, loadTracking } from '../server/tracking';
import { PR_HOOK_MATCHER, gateChecks, linkKind, linkLine, linkStatus, newIssueBody } from '../src/project/gates';
import type { Project, SpecFeature, SpecPR, Tracking } from '../src/project/types';
import { fakeBranches, fakeGitHub, READY_SPEC } from './fakeGitHub';

describe('linkKind (R1, R2)', () => {
  it.each(['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved', 'CLOSES', 'Fixes'])('%s is a closing keyword', kw => {
    expect(linkKind(`${kw} #12`, 12, 'o/root')).toBe('closes');
  });
  it('accepts a colon, the full owner/repo form and surrounding text', () => {
    expect(linkKind('Adds login.\n\nCloses: #12\n', 12, 'o/root')).toBe('closes');
    expect(linkKind('Closes o/root#12', 12, 'o/root')).toBe('closes');
    expect(linkKind('closes O/Root#12', 12, 'o/root')).toBe('closes');
    expect(linkKind('Closes https://github.com/o/root/issues/12', 12, 'o/root')).toBe('closes');
  });
  it('a reference without a closing keyword only mentions the issue', () => {
    expect(linkKind('See #12', 12, 'o/root')).toBe('mentions');
    expect(linkKind('Part of #12', 12, 'o/root')).toBe('mentions');
    expect(linkKind('Part of o/root#12', 12, 'o/root')).toBe('mentions');
    expect(linkKind('Closes #13 and see #12', 12, 'o/root')).toBe('mentions');
  });
  it('does not match another issue, another repo or a longer number', () => {
    expect(linkKind('Closes #123', 12, 'o/root')).toBe('none');
    expect(linkKind('Closes #1', 12, 'o/root')).toBe('none');
    expect(linkKind('Closes other/repo#12', 12, 'o/root')).toBe('none');
    expect(linkKind('Closes https://github.com/other/repo/issues/12', 12, 'o/root')).toBe('none');
    expect(linkKind('abc#12', 12, 'o/root')).toBe('none');
    expect(linkKind('', 12, 'o/root')).toBe('none');
    expect(linkKind(null, 12, 'o/root')).toBe('none');
  });
});

describe('linkKind in a repo other than the root', () => {
  it('a bare #N means that repo\'s own issue, so only the owner/repo and URL forms count', () => {
    expect(linkKind('Closes #12', 12, 'o/root', 'o/back')).toBe('none');
    expect(linkKind('Part of #12', 12, 'o/root', 'o/back')).toBe('none');
    expect(linkKind('Part of o/root#12', 12, 'o/root', 'o/back')).toBe('mentions');
    expect(linkKind('Closes o/root#12', 12, 'o/root', 'o/back')).toBe('closes');
    expect(linkKind('Closes https://github.com/o/root/issues/12', 12, 'o/root', 'o/back')).toBe('closes');
    expect(linkKind('Closes #12', 12, 'o/root', 'o/root')).toBe('closes');
  });
});

describe('a PR that was closed or merged (FR-004, FR-005)', () => {
  beforeEach(() => clearTrackingCache());
  afterEach(() => vi.unstubAllGlobals());
  it('keeps its link whatever its state: the app records the link, GitHub decides what closes', async () => {
    fakeGitHub({ 'o/root': { issues: [{ number: 1, state: 'open', html_url: 'i1', body: newIssueBody('001-login', 'x') }] } }, (u) => {
      if (u.pathname === '/repos/o/root/pulls') return new Response(JSON.stringify([
        gh(10, 'feat/001-login', 'Closes #1', 'closed', null),                      // closed without merging
        gh(11, 'feat/001-login', 'Closes #1', 'closed', '2026-10-17T00:00:00Z')     // merged
      ]));
      if (u.pathname === '/repos/o/back/pulls') return new Response(JSON.stringify([gh(3, 'feat/001-login', 'Part of o/root#1', 'closed', '2026-10-17T00:00:00Z')]));
      return undefined;
    });
    const t = await loadTracking(src, project([feature('001-login')]));
    expect(t.prs['001-login'].map(p => [p.repo, p.number, p.state, p.link])).toEqual([
      ['o/root', 10, 'closed', 'closes'], ['o/root', 11, 'merged', 'closes'], ['o/back', 3, 'merged', 'mentions']
    ]);
    // Nothing was written: speckit-ui never closes or edits an issue because of a PR.
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => (init?.method ?? 'GET') === 'GET')).toBe(true);
  });
});

describe('linkStatus and linkLine (R2, data-model)', () => {
  it('rates a PR in the root repo', () => {
    expect(linkStatus('closes', 'o/root', 'o/root', 12)).toEqual({ ok: true, label: 'Closes #12' });
    expect(linkStatus('mentions', 'o/root', 'o/root', 12)).toEqual({ ok: true, label: 'Linked to #12' });
    expect(linkStatus('none', 'o/root', 'o/root', 12)).toEqual({ ok: false, label: 'Not linked to #12' });
  });
  it('rates a PR in a submodule repo', () => {
    expect(linkStatus('mentions', 'o/back', 'o/root', 12)).toEqual({ ok: true, label: 'Linked to #12' });
    expect(linkStatus('closes', 'o/back', 'o/root', 12)).toEqual({ ok: false, label: 'Closes #12 early' });
    expect(linkStatus('none', 'o/back', 'o/root', 12)).toEqual({ ok: false, label: 'Not linked to #12' });
  });
  it('shows nothing when the spec has no tracking issue', () => {
    expect(linkStatus(null, 'o/root', 'o/root', null)).toBeNull();
  });
  it('writes the line to put in the description', () => {
    expect(linkLine(12, 'o/root', 'o/root')).toBe('Closes #12');
    expect(linkLine(12, 'o/root', 'o/root', false)).toBe('Part of #12');
    expect(linkLine(12, 'o/root', 'o/back')).toBe('Part of o/root#12');
    expect(linkLine(12, 'o/root', 'o/back', true)).toBe('Part of o/root#12');
  });
  it('the line it writes is read back as the right kind', () => {
    expect(linkKind(linkLine(12, 'o/root', 'o/root'), 12, 'o/root')).toBe('closes');
    expect(linkKind(linkLine(12, 'o/root', 'o/root', false), 12, 'o/root')).toBe('mentions');
    expect(linkKind(linkLine(12, 'o/root', 'o/back'), 12, 'o/root')).toBe('mentions');
  });
  it('exports the matcher the gate check installs for PR creation', () => {
    expect(PR_HOOK_MATCHER).toBe('Bash|mcp__.*__create_pull_request');
  });
});

describe('parseUiConfig prLinks (R6)', () => {
  it('is "block" unless the repo turns it off', () => {
    expect(parseUiConfig(null).prLinks).toBe('block');
    expect(parseUiConfig('{"prLinks":"off"}').prLinks).toBe('off');
    expect(parseUiConfig('{"prLinks":"nope"}').prLinks).toBe('block');
    expect(parseUiConfig('not json').prLinks).toBe('block');
    expect(parseUiConfig('{"approvalGates":"off"}').prLinks).toBe('block');
  });
});

// ---- loadTracking gives every PR its link ----

const src: Source = { owner: 'o', repo: 'root', token: 't', identity: 'u1', ref: 'main' };
const feature = (slug: string, over: Partial<SpecFeature> = {}): SpecFeature => ({
  id: slug.slice(0, 3), slug, title: slug, files: [], spec: null, plan: null, tasks: null, analysis: null, checklists: [], docs: {},
  branch: null, sha: '', unmerged: false, variants: [], ...over
});
const project = (specs: SpecFeature[], over: Partial<Project> = {}): Project => ({
  repo: 'o/root', ref: 'main', sha: 'abc1234', committedAt: null, fetchedAt: '', commandPrefix: '/speckit-',
  constitution: { title: 'C' } as Project['constitution'], specs, submodules: [{ path: 'back', repo: 'o/back', sha: 'ptr' }], warnings: [],
  branches: [], skippedBranches: 0, branchPrefixes: ['feat/'], pinned: false, approvalGates: 'block', gateCheck: 'installed', ...over
});
const gh = (n: number, headRef: string, body: string | null, state: 'open' | 'closed' = 'open', mergedAt: string | null = null) =>
  ({ number: n, title: `PR ${n}`, html_url: `h${n}`, state, draft: false, merged_at: mergedAt, merge_commit_sha: null, body, head: { ref: headRef } });

describe('loadTracking sets link (R2)', () => {
  beforeEach(() => clearTrackingCache());
  afterEach(() => vi.unstubAllGlobals());

  it('compares each description with the spec issue', async () => {
    fakeGitHub({ 'o/root': { issues: [{ number: 1, state: 'open', html_url: 'i1', body: newIssueBody('001-login', 'x') }] } }, (u) => {
      if (u.pathname === '/repos/o/root/pulls') return new Response(JSON.stringify([
        gh(10, 'feat/001-login', 'Closes #1'),
        gh(11, 'feat/001-login', 'Part of #1'),
        gh(12, 'feat/001-login', 'Adds login'),
        gh(13, 'feat/001-login', null)
      ]));
      if (u.pathname === '/repos/o/back/pulls') return new Response(JSON.stringify([gh(3, 'feat/001-login', 'Part of o/root#1'), gh(4, 'feat/001-login', 'Closes o/root#1')]));
      return undefined;
    });
    const t = await loadTracking(src, project([feature('001-login')]));
    const links = Object.fromEntries(t.prs['001-login'].map(p => [`${p.repo}#${p.number}`, p.link]));
    expect(links).toEqual({ 'o/root#10': 'closes', 'o/root#11': 'mentions', 'o/root#12': 'none', 'o/root#13': 'none', 'o/back#3': 'mentions', 'o/back#4': 'closes' });
    // The bare form in a submodule PR names that repo's own issue, so it does not count.
  });
  it('does not take #N in a submodule PR as the root issue', async () => {
    fakeGitHub({ 'o/root': { issues: [{ number: 1, state: 'open', html_url: 'i1', body: newIssueBody('001-login', 'x') }] } }, (u) => {
      if (u.pathname === '/repos/o/root/pulls') return new Response('[]');
      if (u.pathname === '/repos/o/back/pulls') return new Response(JSON.stringify([gh(5, 'feat/001-login', 'Part of #1')]));
      return undefined;
    });
    const t = await loadTracking(src, project([feature('001-login')]));
    expect(t.prs['001-login'].map(p => p.link)).toEqual(['none']);
  });

  it('is null for every PR of a spec that has no tracking issue', async () => {
    fakeGitHub({ 'o/root': { issues: [] } }, (u) => {
      if (u.pathname === '/repos/o/root/pulls') return new Response(JSON.stringify([gh(20, 'feat/002-export', 'Closes #1')]));
      if (u.pathname === '/repos/o/back/pulls') return new Response('[]');
      return undefined;
    });
    const t = await loadTracking(src, project([feature('002-export')]));
    expect(t.prs['002-export'].map(p => p.link)).toEqual([null]);
  });

  it('finds the issue of a spec that exists only on a feat/ branch by its slug (FR-007)', async () => {
    fakeGitHub({ 'o/root': { issues: [{ number: 7, state: 'open', html_url: 'i7', body: newIssueBody('003-branchy', 'x') }] } }, (u) => {
      if (u.pathname === '/repos/o/root/pulls') return new Response(JSON.stringify([gh(30, 'feat/003-branchy', 'Closes #7')]));
      if (u.pathname === '/repos/o/back/pulls') return new Response('[]');
      return undefined;
    });
    const onBranch = feature('003-branchy', { branch: 'feat/003-branchy', unmerged: true });
    const t = await loadTracking(src, project([onBranch]));
    expect(t.prs['003-branchy'].map(p => p.link)).toEqual(['closes']);
  });
});

// ---- gateCheck: installed, outdated, missing (R5) ----

describe('gateCheck outdated (R5)', () => {
  beforeEach(() => clearProjectCache());
  afterEach(() => vi.unstubAllGlobals());
  const repo = (files: Record<string, string>) => ({ defaultBranch: 'main', branches: { main: { 'specs/001-a/spec.md': READY_SPEC('A'), ...files } } });
  const HOOK = '.claude/hooks/speckit-gate.mjs';
  const run = 'node .claude/hooks/speckit-gate.mjs';
  const settings = (...groups: object[]) => JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: run }] }], PreToolUse: groups } });

  it('is installed with the PR matcher, outdated without it, missing without the script', async () => {
    fakeBranches('o/root', repo({ [HOOK]: '// gate', '.claude/settings.json': settings({ matcher: 'Skill', hooks: [{ command: run }] }, { matcher: PR_HOOK_MATCHER, hooks: [{ command: run }] }) }));
    expect((await loadProject(src)).gateCheck).toBe('installed');
    clearProjectCache();
    fakeBranches('o/root', repo({ [HOOK]: '// gate', '.claude/settings.json': settings({ matcher: 'Skill', hooks: [{ command: run }] }) }));
    expect((await loadProject(src)).gateCheck).toBe('outdated');
    clearProjectCache();
    fakeBranches('o/root', repo({ '.claude/settings.json': settings({ matcher: PR_HOOK_MATCHER, hooks: [{ command: run }] }) }));
    expect((await loadProject(src)).gateCheck).toBe('missing');
    clearProjectCache();
    fakeBranches('o/root', repo({ [HOOK]: '// gate' }));
    expect((await loadProject(src)).gateCheck).toBe('missing');
  });
});

// ---- The Implement gate warns about links (FR-003) ----

describe('Implement gate link warnings', () => {
  const f = feature('001-login', {
    tasks: [{ name: 'P', tasks: [{ id: 'T1', done: true, parallel: false, story: 'US1', text: 'x', path: 'a/b' }] }]
  });
  const pr = (repo: string, number: number, link: SpecPR['link']): SpecPR =>
    ({ repo, number, title: 't', url: 'u', state: 'open', mergedAt: null, headRef: 'feat/001-login', bumped: null, link });
  const t = (issue: boolean) => ({
    repos: [{ repo: 'o/root', path: null, pointer: null }, { repo: 'o/back', path: 'back', pointer: 'p' }],
    issues: (issue ? { '001-login': { number: 1, url: 'u', state: 'open' as const, gates: {}, updatedAt: null } } : {}) as Tracking['issues']
  });
  const warnings = (prs: SpecPR[], issue = true) => gateChecks(f, 'implement', prs, t(issue)).filter(c => /links to|closes #/.test(c.label));

  it('"Every PR links" passes only when every PR is linked in the right way', () => {
    const ok = warnings([pr('o/root', 1, 'closes'), pr('o/back', 2, 'mentions')]).find(c => c.label === 'Every PR links to #1');
    expect(ok?.ok).toBe(true);
    const bad = warnings([pr('o/root', 1, 'closes'), pr('o/root', 3, 'none')]).find(c => c.label === 'Every PR links to #1');
    expect(bad?.ok).toBe(false);
    const early = warnings([pr('o/back', 2, 'closes')]).find(c => c.label === 'Every PR links to #1');
    expect(early?.ok).toBe(false);
  });
  it('"A PR in this repo closes" needs one root-repo PR with a closing keyword, and ignores submodule PRs', () => {
    const label = 'A PR in this repo closes #1';
    expect(warnings([pr('o/root', 1, 'mentions'), pr('o/root', 2, 'closes')]).find(c => c.label === label)?.ok).toBe(true);
    expect(warnings([pr('o/root', 1, 'mentions')]).find(c => c.label === label)?.ok).toBe(false);
    expect(warnings([pr('o/back', 2, 'mentions')]).find(c => c.label === label)).toBeUndefined();
  });
  it('is only a warning and is left out without an issue or without PRs', () => {
    const checks = gateChecks(f, 'implement', [pr('o/root', 1, 'none')], t(true));
    expect(checks.filter(c => /links to|closes #/.test(c.label)).every(c => !c.required)).toBe(true);
    expect(warnings([pr('o/root', 1, null)], false)).toEqual([]);
    expect(warnings([])).toEqual([]);
    expect(gateChecks(f, 'implement', [pr('o/root', 1, 'none')]).some(c => /links to|closes #/.test(c.label))).toBe(false);
  });
});
