import type { Project } from './types';
import { SPEC_DIR, buildFeature, wantedInSpec } from '../../server/project';
import { commandPrefix, parseConstitution, parseUiConfig } from '../../server/parse';
import type { LocalDirectoryHandle, LocalFileHandle } from './localRepositoryPersistence';

const validPath = (path: string) => path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
  path.split('/').every(part => part !== '' && part !== '.' && part !== '..');

/** Builds the same parsed project shape as GitHub mode from browser-selected relative paths. */
export function buildLocalProject(name: string, selectedFiles: ReadonlyMap<string, string>, warnings: string[] = []): Project {
  const files = new Map([...selectedFiles].filter(([path]) => validPath(path)));
  const directories = new Map<string, string[]>();
  for (const path of files.keys()) {
    const match = path.match(/^specs\/([^/]+)\/(.+)$/);
    if (!match || !SPEC_DIR.test(match[1]) || !wantedInSpec(match[2])) continue;
    directories.set(match[1], [...(directories.get(match[1]) ?? []), match[2]]);
  }

  const specs = [...directories].sort(([a], [b]) => a.localeCompare(b)).map(([dir, paths]) => {
    const feature = buildFeature(dir, paths, path => files.get(`specs/${dir}/${path}`) ?? null, '');
    feature.variants = [{ branches: ['local'], treeSha: '', sha: '', onDefault: true, stage: 0, committedAt: null, pointers: {} }];
    return feature;
  });
  const constitution = files.get('.specify/memory/constitution.md') ?? null;
  const ui = parseUiConfig(files.get('.specify/speckit-ui.json') ?? null);

  return {
    repo: name || 'Local repository',
    ref: 'local',
    sha: '',
    committedAt: null,
    fetchedAt: new Date().toISOString(),
    commandPrefix: commandPrefix(files.get('.specify/integration.json') ?? null),
    constitution: constitution ? parseConstitution(constitution) : null,
    specs,
    submodules: [],
    warnings,
    branches: [],
    skippedBranches: 0,
    branchPrefixes: ui.branchPrefixes,
    pinned: true,
    approvalGates: 'off',
    gateCheck: 'missing'
  };
}

export function firstLocalDocumentPath(project: Project): string | null {
  const feature = project.specs[0];
  if (!feature) return null;
  const file = feature.files.includes('spec.md') ? 'spec.md' : feature.files[0];
  return file ? `specs/${feature.slug}/${file}` : null;
}

export const isLocalProjectPath = (path: string) => {
  if (!validPath(path)) return false;
  if (path === '.specify/memory/constitution.md' || path === '.specify/integration.json' ||
      path === '.specify/speckit-ui.json') return true;
  const match = path.match(/^specs\/([^/]+)\/(.+)$/);
  return !!match && SPEC_DIR.test(match[1]) && wantedInSpec(match[2]);
};

export interface LocalFileSnapshot {
  name: string;
  files: Map<string, string>;
  warnings: string[];
}

/** Reads only supported files from one user-selected directory; nothing leaves this page. */
export async function readLocalDirectory(selection: Iterable<File>): Promise<LocalFileSnapshot> {
  const selected = [...selection];
  if (!selected.length) throw new Error('No files were selected. Choose a repository directory.');

  let name = '';
  const files = new Map<string, string>();
  const warnings: string[] = [];
  for (const file of selected) {
    const relativePath = typeof file.webkitRelativePath === 'string' ? file.webkitRelativePath : '';
    const parts = relativePath.split('/');
    if (parts.length < 2 || !parts[0] || (name && parts[0] !== name)) {
      throw new Error('The browser did not provide one repository directory. Choose a single repository folder.');
    }
    name ||= parts[0];
    const path = parts.slice(1).join('/');
    if (!isLocalProjectPath(path)) continue;
    try {
      files.set(path, await file.text());
    } catch (error) {
      warnings.push(`Could not read ${path}: ${error instanceof Error ? error.message : 'The browser could not read this file.'}`);
    }
  }

  return { name, files, warnings };
}

/** Reads only supported Spec Kit files from a reusable, user-selected directory handle. */
export async function readLocalDirectoryHandle(root: LocalDirectoryHandle): Promise<LocalFileSnapshot> {
  const files = new Map<string, string>();
  const warnings: string[] = [];

  const visit = async (directory: LocalDirectoryHandle, parentPath: string): Promise<void> => {
    let entries: Array<[string, LocalFileHandle | LocalDirectoryHandle]>;
    try {
      entries = [];
      for await (const entry of directory.entries()) entries.push(entry);
    } catch (error) {
      warnings.push(`Could not read ${parentPath || directory.name}: ${error instanceof Error ? error.message : 'The browser could not read this directory.'}`);
      return;
    }

    for (const [name, entry] of entries) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      if (entry.kind === 'directory') {
        if (shouldReadDirectory(path)) await visit(entry, path);
        continue;
      }
      if (!isLocalProjectPath(path)) continue;
      try {
        files.set(path, await (await entry.getFile()).text());
      } catch (error) {
        warnings.push(`Could not read ${path}: ${error instanceof Error ? error.message : 'The browser could not read this file.'}`);
      }
    }
  };

  await visit(root, '');
  return { name: root.name, files, warnings };
}

function shouldReadDirectory(path: string): boolean {
  if (path === 'specs' || path === '.specify' || path === '.specify/memory') return true;
  if (path.startsWith('specs/')) {
    const parts = path.split('/');
    if (parts.length === 2) return SPEC_DIR.test(parts[1]);
    return parts.length === 3 && SPEC_DIR.test(parts[1]) && parts[2] === 'checklists';
  }
  return false;
}
