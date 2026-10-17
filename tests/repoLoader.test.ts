import { describe, expect, it } from 'vitest';
import { GitHubError } from '../server/github';
import { STALE, accessProblem, createRepoLoader } from '../src/project/repoLoader';
import { HttpError } from '../src/project/trackingApi';

const later = <T,>(v: T, ms = 10) => new Promise<T>(r => setTimeout(() => r(v), ms));
const fails = (e: Error, ms = 10) => new Promise<never>((_, j) => setTimeout(() => j(e), ms));

describe('repo loader', () => {
  it('drops an answer for an earlier repo that arrives after a switch (latest wins)', async () => {
    const l = createRepoLoader();
    l.switchTo('o/a');
    const a = l.run('o/a', () => later('A', 20));
    l.switchTo('o/b');
    const b = l.run('o/b', () => later('B', 5));
    expect(await b).toBe('B');
    expect(await a).toBe(STALE);
  });

  it('keeps errors to their repo', async () => {
    const l = createRepoLoader();
    l.switchTo('o/a');
    const a = l.run('o/a', () => fails(new Error('A broke')));
    l.switchTo('o/b');
    await expect(a).resolves.toBe(STALE);
    await expect(l.run('o/b', () => fails(new Error('B broke')))).rejects.toThrow('B broke');
  });

  it('treats a switch away and back as a new load', async () => {
    const l = createRepoLoader();
    l.switchTo('o/a');
    const first = l.run('o/a', () => later(1, 20));
    l.switchTo('o/b');
    l.switchTo('o/a');
    const second = l.run('o/a', () => later(2, 5));
    expect(await second).toBe(2);
    expect(await first).toBe(STALE);
  });
});

describe('access problems', () => {
  it('reports a repo that can no longer be read', () => {
    expect(accessProblem(new GitHubError('x', 404), 'read', 'o/a')).toMatch(/o\/a is no longer accessible/);
    expect(accessProblem(new HttpError('x', 403), 'read', 'o/a')).toMatch(/no longer accessible/);
  });

  it('reports read access without Issues write when approving', () => {
    expect(accessProblem(new GitHubError('x', 403), 'write', 'o/a')).toMatch(/can read o\/a but cannot write issues/);
    expect(accessProblem(new HttpError('x', 403), 'write', 'o/a')).toMatch(/Issues: Read and write/);
  });

  it('leaves other errors alone', () => {
    expect(accessProblem(new GitHubError('x', 502), 'read', 'o/a')).toBeNull();
    expect(accessProblem(new GitHubError('rate', 429), 'write', 'o/a')).toBeNull();
    expect(accessProblem(new Error('net'), 'read', 'o/a')).toBeNull();
  });
});
