// Keeps one repo's data from showing up in another (FR-006): every load is tagged with its repo,
// and a result that arrives after the user switched away is dropped.

export const STALE: unique symbol = Symbol('stale');

export interface RepoLoader {
  current(): string | null;
  /** Makes `repo` the one on screen; loads for any other repo become stale. */
  switchTo(repo: string | null): void;
  /** Resolves STALE (and swallows errors) when `repo` is no longer current by the time `fn` settles. */
  run<T>(repo: string, fn: () => Promise<T>): Promise<T | typeof STALE>;
}

export function createRepoLoader(): RepoLoader {
  let current: string | null = null;
  let generation = 0;
  return {
    current: () => current,
    switchTo(repo) { if (repo !== current) { current = repo; generation++; } },
    async run(repo, fn) {
      const gen = generation;
      const live = () => gen === generation && repo === current;
      try {
        const v = await fn();
        return live() ? v : STALE;
      } catch (e) {
        if (live()) throw e;
        return STALE;
      }
    }
  };
}

const statusOf = (e: unknown) => (e && typeof e === 'object' && 'status' in e && typeof e.status === 'number' ? e.status : null);

/** A readable message when GitHub refuses access to one repo, or null for other errors (FR-012). */
export function accessProblem(e: unknown, action: 'read' | 'write', repo: string): string | null {
  const status = statusOf(e);
  if (action === 'write' && status === 403) return `You can read ${repo} but cannot write issues there. Ask for Issues: Read and write on this repository to approve gates.`;
  if (action === 'read' && (status === 404 || status === 403)) return `${repo} is no longer accessible with your GitHub access. It may have been deleted, or your access was removed.`;
  return null;
}
