// Shared pure project-model construction for GitHub and local repository readers.
import type { SpecFeature } from '../src/project/types.ts';
import {
  parseAnalysis, parseChecklist, parsePlan, parseSpec, parseTasks
} from './parse.ts';
import { HIGHLIGHTS_FILE, parseHighlights } from './highlightsFile.ts';

const DOCS = ['research.md', 'data-model.md', 'quickstart.md'];

export const SPEC_DIR = /^\d{3,}-[^/]+$/;

export const wantedInSpec = (file: string) =>
  ['spec.md', 'plan.md', 'tasks.md', 'analysis.md', HIGHLIGHTS_FILE, ...DOCS].includes(file) ||
  /^checklists\/[^/]+\.md$/.test(file);

/** A spec folder parsed from its files; `read(file)` gives text relative to the spec folder. */
export function buildFeature(dir: string, files: string[], read: (file: string) => string | null, sha: string): SpecFeature {
  const spec = read('spec.md');
  const plan = read('plan.md');
  const tasks = read('tasks.md');
  const analysis = read('analysis.md');
  const parsedSpec = spec ? parseSpec(spec) : null;
  const sorted = [...files].sort();
  return {
    id: dir.match(/^\d+/)![0],
    slug: dir,
    title: parsedSpec?.title || dir.replace(/^\d+-/, '').replace(/-/g, ' '),
    files: sorted,
    spec: parsedSpec,
    plan: plan ? parsePlan(plan) : null,
    tasks: tasks ? parseTasks(tasks) : null,
    analysis: analysis ? parseAnalysis(analysis) : null,
    checklists: sorted.filter(file => /^checklists\/[^/]+\.md$/.test(file) && read(file) !== null).map(file => parseChecklist(file.slice('checklists/'.length), read(file)!)),
    docs: Object.fromEntries(DOCS.flatMap(file => (read(file) !== null ? [[file, read(file)!]] : []))),
    branch: null,
    sha,
    unmerged: false,
    variants: [],
    highlights: parseHighlights(read(HIGHLIGHTS_FILE))
  };
}
