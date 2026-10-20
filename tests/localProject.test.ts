import { describe, expect, it } from 'vitest';
import { buildLocalProject, firstLocalDocumentPath, readLocalDirectory, readLocalDirectoryHandle } from '../src/project/localProject';
import type { LocalDirectoryHandle, LocalFileHandle } from '../src/project/localRepositoryPersistence';

const documents = ['spec.md', 'plan.md', 'tasks.md', 'analysis.md', 'research.md'];

const fixture = () => new Map<string, string>([
  ...Array.from({ length: 3 }, (_, i) => {
    const slug = `00${i + 1}-local-feature-${i + 1}`;
    return documents.map(file => [`specs/${slug}/${file}`, file === 'spec.md' ? `# Local feature ${i + 1}\n\n## Requirements\n\n- **FR-001**: Read local content.` : `# ${file}\n\nFixture ${i + 1}.`] as const);
  }).flat(),
  ['.specify/integration.json', '{"ai":"claude","scripts":{"specify":"speckit.specify"}}']
]);

describe('buildLocalProject', () => {
  it('builds all specs and supported documents from the selected files', () => {
    const project = buildLocalProject('fixture-repo', fixture());

    expect(project.repo).toBe('fixture-repo');
    expect(project.specs).toHaveLength(3);
    expect(firstLocalDocumentPath(project)).toBe('specs/001-local-feature-1/spec.md');
    for (const [index, feature] of project.specs.entries()) {
      expect(feature.title).toBe(`Local feature ${index + 1}`);
      expect(feature.files).toEqual([...documents].sort());
      expect(feature.docs['research.md']).toContain(`Fixture ${index + 1}`);
      expect(feature.spec?.frs).toEqual([{ id: 'FR-001', text: 'Read local content.' }]);
    }
    expect(project.commandPrefix).toBe('/speckit.');
  });

  it('keeps empty or invalid repository selections empty instead of substituting demo data', () => {
    expect(buildLocalProject('empty', new Map()).specs).toEqual([]);
    expect(buildLocalProject('invalid', new Map([['not-a-spec/readme.md', '# unrelated']])).specs).toEqual([]);
  });

  it('retains readable specs and surfaces individual read warnings', () => {
    const files = fixture();
    files.delete('specs/001-local-feature-1/plan.md');
    const project = buildLocalProject('partial', files, ['Could not read specs/001-local-feature-1/plan.md']);

    expect(project.specs).toHaveLength(3);
    expect(project.specs[0].plan).toBeNull();
    expect(project.warnings).toEqual(['Could not read specs/001-local-feature-1/plan.md']);
  });
});

describe('readLocalDirectory', () => {
  const file = (path: string, content: string) => {
    const selected = new File([content], path.split('/').at(-1)!, { type: 'text/markdown' });
    Object.defineProperty(selected, 'webkitRelativePath', { value: `fixture/${path}` });
    return selected;
  };

  it('reads supported files relative to one selected repository and ignores unrelated files', async () => {
    const snapshot = await readLocalDirectory([
      file('specs/001-local/spec.md', '# Actual spec'),
      file('README.md', '# Ignore this')
    ]);

    expect(snapshot.name).toBe('fixture');
    expect(snapshot.files).toEqual(new Map([['specs/001-local/spec.md', '# Actual spec']]));
    expect(snapshot.warnings).toEqual([]);
  });

  it('rejects files that do not belong to exactly one selected directory', async () => {
    await expect(readLocalDirectory([new File(['# no relative path'], 'spec.md')])).rejects.toThrow(/single repository folder/);
    await expect(readLocalDirectory([
      file('specs/001-local/spec.md', '# one'),
      (() => {
        const other = new File(['# two'], 'spec.md');
        Object.defineProperty(other, 'webkitRelativePath', { value: 'another/specs/002-other/spec.md' });
        return other;
      })()
    ])).rejects.toThrow(/single repository folder/);
  });

  it('keeps readable files and reports an individual read failure', async () => {
    const unreadable = file('specs/001-local/spec.md', '# unreadable');
    Object.defineProperty(unreadable, 'text', { value: () => Promise.reject(new Error('permission denied')) });
    const readable = file('specs/001-local/plan.md', '# Readable plan');
    const snapshot = await readLocalDirectory([unreadable, readable]);

    expect(snapshot.files.get('specs/001-local/plan.md')).toBe('# Readable plan');
    expect(snapshot.files.has('specs/001-local/spec.md')).toBe(false);
    expect(snapshot.warnings).toEqual(['Could not read specs/001-local/spec.md: permission denied']);
  });
});

describe('readLocalDirectoryHandle', () => {
  const fileHandle = (name: string, text: string): LocalFileHandle => ({
    kind: 'file',
    getFile: async () => new File([text], name, { type: 'text/markdown' })
  });
  const directoryHandle = (name: string, entries: Array<[string, LocalFileHandle | LocalDirectoryHandle]>): LocalDirectoryHandle => ({
    kind: 'directory',
    name,
    entries: async function* () { yield* entries; },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted'
  });

  it('reads supported files recursively and ignores unrelated files', async () => {
    const handle = directoryHandle('fixture', [
      ['README.md', fileHandle('README.md', '# Ignore')],
      ['specs', directoryHandle('specs', [
        ['001-local', directoryHandle('001-local', [
          ['spec.md', fileHandle('spec.md', '# Local spec')],
          ['notes.txt', fileHandle('notes.txt', 'Ignore')]
        ])]
      ])]
    ]);

    const snapshot = await readLocalDirectoryHandle(handle);

    expect(snapshot.name).toBe('fixture');
    expect(snapshot.files).toEqual(new Map([['specs/001-local/spec.md', '# Local spec']]));
    expect(snapshot.warnings).toEqual([]);
  });

  it('keeps readable documents and reports an individual read failure', async () => {
    const unreadable: LocalFileHandle = {
      kind: 'file',
      getFile: async () => { throw new Error('permission denied'); }
    };
    const handle = directoryHandle('fixture', [
      ['specs', directoryHandle('specs', [
        ['001-local', directoryHandle('001-local', [
          ['spec.md', unreadable],
          ['plan.md', fileHandle('plan.md', '# Plan')]
        ])]
      ])]
    ]);

    const snapshot = await readLocalDirectoryHandle(handle);

    expect(snapshot.files).toEqual(new Map([['specs/001-local/plan.md', '# Plan']]));
    expect(snapshot.warnings).toEqual(['Could not read specs/001-local/spec.md: permission denied']);
  });

  it('reports when a saved directory can no longer be read', async () => {
    const handle: LocalDirectoryHandle = {
      kind: 'directory',
      name: 'missing-repository',
      entries: async function* () { throw new Error('directory unavailable'); },
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted'
    };

    const snapshot = await readLocalDirectoryHandle(handle);

    expect(snapshot.files).toEqual(new Map());
    expect(snapshot.warnings).toEqual(['Could not read missing-repository: directory unavailable']);
  });
});
