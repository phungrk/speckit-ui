// Commits a spec's highlights (specs/010-spec-annotations). Shared by the server and the static
// build (constitution III): no Node-only APIs. The only write is one Contents API commit to
// specs/NNN-slug/highlights.json (constitution I 1.4.0).
import { GitHubError, gh, type Source } from './github.ts';
import { HIGHLIGHTS_FILE, HighlightError, MAX_BYTES, applyChange, commitMessage, parseHighlights, serializeHighlights } from './highlightsFile.ts';
import type { Highlight, HighlightAuthor, HighlightChange } from '../src/project/types.ts';

export * from './highlightsFile.ts';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export interface SaveResult { items: Highlight[]; commit: { sha: string; url: string } }

/**
 * Reads the file on `branch`, applies `change` for `user`, and commits it with the read sha.
 * A concurrent commit (409, or 422 about the sha) is retried on the new version, up to 3 times.
 */
export async function saveHighlight(src: Source, { slug, branch, change, user }: { slug: string; branch: string; change: HighlightChange; user: string }): Promise<SaveResult> {
  const path = `specs/${slug}/${HIGHLIGHTS_FILE}`;
  const base = `/repos/${src.owner}/${src.repo}/contents/${enc(path)}`;
  const by: HighlightAuthor = { login: user };
  for (let attempt = 0; attempt < 3; attempt++) {
    let sha: string | undefined, text: string | null = null;
    try {
      const got = await (await gh(src, `${base}?ref=${encodeURIComponent(branch)}`)).json() as { sha: string; content: string };
      sha = got.sha; text = fromBase64(got.content);
    } catch (e) {
      if (!(e instanceof GitHubError && e.status === 404)) throw e;
    }
    const parsed = parseHighlights(text);
    if (parsed.error) throw new HighlightError(parsed.error, 409);
    const items = applyChange(parsed.items, change, by);
    const body = serializeHighlights(items);
    if (new TextEncoder().encode(body).length > MAX_BYTES) throw new HighlightError('This spec has too many highlights to save more.', 413);
    try {
      const res = await (await gh(src, base, false, { method: 'PUT', body: { message: commitMessage(change, parsed.items, user), content: toBase64(body), branch, ...(sha ? { sha } : {}) } })).json() as { commit: { sha: string; html_url: string } };
      return { items, commit: { sha: res.commit.sha, url: res.commit.html_url } };
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 409 || e.status === 422 && sha)) continue;
      if (e instanceof GitHubError && (e.status === 403 || e.status === 404)) throw new HighlightError(`Your token cannot commit to ${branch} (needs Contents: Read and write), or the branch is protected.`, 403);
      if (e instanceof GitHubError && e.status === 422) throw new HighlightError(`${branch} no longer exists, so highlights here are read-only.`, 422);
      throw e;
    }
  }
  throw new HighlightError('Someone else saved highlights at the same time. Try again.', 409);
}
