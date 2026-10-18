import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLocalProject, readLocalDirectory } from '../src/project/localProject';

describe('local mode privacy boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses user-selected content without sending a request or writing files', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const file = new File(['# Private local spec'], 'spec.md', { type: 'text/markdown' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'private-repo/specs/001-private/spec.md' });

    const snapshot = await readLocalDirectory([file]);
    const project = buildLocalProject(snapshot.name, snapshot.files, snapshot.warnings);

    expect(project.specs[0].spec?.title).toBe('Private local spec');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
