// Parsers for the markdown files Spec Kit writes. Pure functions: string in, data out.
import type {
  AnalysisFinding, ChecklistSummary, ClarifyItem, Constitution, LiveTask, ParsedAnalysis, ParsedPlan,
  ParsedSpec, Principle, SpecRequirement, TaskPhase
} from '../src/project/types.ts';
import type { Acceptance, Story } from '../src/types.ts';

interface Section { title: string; body: string }

const stripComments = (md: string) => md.replace(/<!--[\s\S]*?-->/g, '');
const clean = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

/** Split markdown at headings of exactly `level`, ignoring headings inside code fences. */
export function sections(md: string, level: number): Section[] {
  const out: Section[] = [];
  const marker = '#'.repeat(level) + ' ';
  let fence = false;
  let cur: Section | null = null;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && line.startsWith(marker)) {
      cur = { title: line.slice(marker.length).trim(), body: '' };
      out.push(cur);
    } else if (cur) cur.body += line + '\n';
  }
  return out;
}

const section = (md: string, level: number, title: RegExp) => sections(md, level).find(s => title.test(s.title));

/** `**Key**: value` pairs, including several on one line separated by `|`. */
export function fields(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of md.split('\n')) {
    for (const m of line.matchAll(/\*\*([^*]+)\*\*:\s*(.*?)(?=\s*\|\s*\*\*[^*]+\*\*:|$)/g)) {
      const key = m[1].trim();
      if (!(key in out) && m[2].trim()) out[key] = m[2].trim().replace(/^`(.*)`$/, '$1');
    }
  }
  return out;
}

const NC = /\[NEEDS CLARIFICATION:?\s*([^\]]*)\]/;

function requirements(md: string, prefix: 'FR' | 'SC'): SpecRequirement[] {
  const re = new RegExp(`^\\s*[-*]\\s+\\*\\*(${prefix}-\\d+)\\*\\*:?\\s*(.*)$`);
  return md.split('\n').flatMap(line => {
    const m = line.match(re);
    if (!m) return [];
    const nc = m[2].match(NC);
    return [{ id: m[1], text: clean(m[2].replace(NC, '')), ...(nc ? { clarification: nc[1].trim() || 'Needs clarification' } : {}) }];
  });
}

function stories(md: string): Story[] {
  return sections(md, 3).flatMap(s => {
    const h = s.title.match(/^User Story\s+(\d+)\s*[-–—:]\s*(.*?)\s*(?:\(Priority:\s*(P\d+)\))?\s*$/i);
    if (!h) return [];
    const lines = s.body.split('\n');
    const para: string[] = [];
    for (const l of lines) {
      if (!l.trim()) { if (para.length) break; continue; }
      if (l.trim().startsWith('**') || l.trim().startsWith('#')) { if (para.length) break; continue; }
      para.push(l.trim());
    }
    const ac: Acceptance[] = lines.flatMap(l => {
      const m = l.match(/^\s*\d+\.\s+\*\*Given\*\*\s*(.*?)[,;]?\s*\*\*When\*\*\s*(.*?)[,;]?\s*\*\*Then\*\*\s*(.*?)\.?\s*$/i);
      return m ? [[clean(m[1]), clean(m[2]), clean(m[3])] as Acceptance] : [];
    });
    return [{ id: 'US' + h[1], p: h[3] || '', title: h[2], text: para.join(' '), ac }];
  });
}

function clarifications(md: string): ClarifyItem[] {
  const sec = section(md, 2, /^Clarifications/i);
  if (!sec) return [];
  const out: ClarifyItem[] = [];
  let session = '';
  for (const line of sec.body.split('\n')) {
    const s = line.match(/^###\s+Session\s+(.*)$/i);
    if (s) { session = s[1].trim(); continue; }
    const m = line.match(/^\s*[-*]\s+Q:\s*(.*?)\s*(?:→|->)\s*A:\s*(.*)$/);
    if (m) out.push({ session, q: clean(m[1]), a: clean(m[2]) });
  }
  return out;
}

export function parseSpec(raw: string): ParsedSpec {
  const md = stripComments(raw);
  const h1 = md.match(/^#\s+(.*)$/m)?.[1] ?? '';
  const head = md.split(/^##\s/m)[0];
  return {
    title: h1.replace(/^Feature Specification:\s*/i, '').trim(),
    fields: fields(head),
    stories: stories(md),
    frs: requirements(md, 'FR'),
    sc: requirements(md, 'SC'),
    needsClarification: (md.match(/\[NEEDS CLARIFICATION/g) || []).length,
    clarifications: clarifications(md),
    raw
  };
}

export function parsePlan(raw: string): ParsedPlan {
  const md = stripComments(raw);
  const ctx = section(md, 2, /^Technical Context/i);
  const check = section(md, 2, /^Constitution Check/i);
  return {
    summary: section(md, 2, /^Summary/i)?.body.trim() ?? '',
    context: ctx ? Object.entries(fields(ctx.body)) : [],
    checks: check ? check.body.split('\n').flatMap(l => {
      const m = l.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
      if (!m) return [];
      const bold = m[2].match(/^\*\*(.+?)\*\*/);
      return [[clean(bold ? bold[1] : m[2]).replace(/:$/, ''), m[1] !== ' '] as [string, boolean]];
    }) : [],
    raw
  };
}

export function parseTasks(raw: string): TaskPhase[] {
  const phases: TaskPhase[] = [];
  let cur: TaskPhase | null = null;
  for (const line of stripComments(raw).split('\n')) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      const ph = h[1].match(/^Phase\s+\d+\s*:\s*(.*)$/i);
      cur = ph ? { name: ph[1].trim(), tasks: [] } : null;
      if (cur) phases.push(cur);
      continue;
    }
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(T\d+)\s+(.*)$/);
    if (!m) continue;
    if (!cur) { cur = { name: 'Tasks', tasks: [] }; phases.push(cur); }
    let rest = m[3];
    let parallel = false;
    let story: string | undefined;
    for (let tag = rest.match(/^\[([^\]]+)\]\s*/); tag; tag = rest.match(/^\[([^\]]+)\]\s*/)) {
      if (tag[1] === 'P') parallel = true;
      else if (/^US\d+$/.test(tag[1])) story = tag[1];
      else break;
      rest = rest.slice(tag[0].length);
    }
    const path = [...rest.matchAll(/`([^`]+)`/g)].map(x => x[1]).find(p => /[/.]/.test(p) && !/\s/.test(p));
    const task: LiveTask = { id: m[2], done: m[1] !== ' ', parallel, text: rest.trim(), ...(story ? { story } : {}), ...(path ? { path } : {}) };
    cur.tasks.push(task);
  }
  return phases.filter(p => p.tasks.length);
}

/** Rows of every markdown table in `md`, as objects keyed by lower-cased header. */
export function tables(md: string): Record<string, string>[][] {
  const out: Record<string, string>[][] = [];
  const lines = md.split('\n');
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].trim().startsWith('|') || !/^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) continue;
    const head = cells(lines[i]).map(h => h.toLowerCase());
    const rows: Record<string, string>[] = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const c = cells(lines[j]);
      rows.push(Object.fromEntries(head.map((h, k) => [h, c[k] ?? ''])));
    }
    out.push(rows);
    i = j - 1;
  }
  return out;
}

export function parseAnalysis(raw: string): ParsedAnalysis {
  const md = stripComments(raw);
  const pick = (r: Record<string, string>, ...keys: string[]) => keys.map(k => r[k]).find(v => v !== undefined) ?? '';
  const findings: AnalysisFinding[] = tables(md)
    .filter(rows => rows.length && 'id' in rows[0] && 'severity' in rows[0])
    .flat()
    .filter(r => r.id && !/^-+$/.test(r.id))
    .map(r => ({
      id: clean(r.id), category: clean(pick(r, 'category')), severity: clean(r.severity).toUpperCase(),
      location: clean(pick(r, 'location(s)', 'location', 'locations')), summary: clean(pick(r, 'summary')),
      recommendation: clean(pick(r, 'recommendation'))
    }));
  return { findings, raw };
}

export function parseChecklist(name: string, raw: string): ChecklistSummary {
  const items = raw.match(/^\s*[-*]\s+\[( |x|X)\]/gm) || [];
  return { name, total: items.length, done: items.filter(i => /\[(x|X)\]/.test(i)).length };
}

export function parseConstitution(raw: string): Constitution {
  const md = stripComments(raw);
  const core = section(md, 2, /Principles/i)?.body ?? md;
  const principles: Principle[] = sections(core, 3).flatMap(s => {
    const m = s.title.match(/^([IVXLC]+)\.\s*(.*)$/);
    return m ? [{ num: m[1], title: m[2].trim(), body: s.body.trim() }] : [];
  });
  const f = fields(md);
  return {
    title: md.match(/^#\s+(.*)$/m)?.[1].trim() ?? 'Constitution',
    version: f['Version'] ?? null,
    ratified: f['Ratified'] ?? null,
    amended: f['Last Amended'] ?? null,
    principles,
    raw: md.trim()
  };
}

/** "/speckit-" when the integration invokes skills with "-", else "/speckit.". */
export function commandPrefix(integrationJson: string | null): string {
  try {
    const cfg = JSON.parse(integrationJson || '{}');
    const sep = cfg.integration_settings?.[cfg.integration]?.invoke_separator;
    return '/speckit' + (sep === '-' ? '-' : '.');
  } catch {
    return '/speckit.';
  }
}

/** Submodule path → GitHub "owner/repo" (null when the URL isn't on github.com). */
export function parseGitmodules(raw: string): { path: string; repo: string | null }[] {
  return raw.split(/^\[submodule /m).slice(1).flatMap(block => {
    const path = block.match(/^\s*path\s*=\s*(.+?)\s*$/m)?.[1];
    const url = block.match(/^\s*url\s*=\s*(.+?)\s*$/m)?.[1] ?? '';
    if (!path) return [];
    const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    return [{ path, repo: m ? `${m[1]}/${m[2]}` : null }];
  });
}

/** Branch prefixes read for unmerged specs when the repo sets none (specs/003). */
export const DEFAULT_BRANCH_PREFIXES = ['feat/'];

const strings = (v: unknown): string[] | null => (Array.isArray(v) && v.every(x => typeof x === 'string') ? v : null);

export interface UiConfig {
  mergeOrder: string[];
  branchPrefixes: string[];
  /** "off" turns the approval gate lock off for this repo (specs/004 R6). */
  approvalGates: 'block' | 'off';
}

/**
 * Optional `.specify/speckit-ui.json`, e.g.
 * `{ "mergeOrder": ["edge", "wedding-front"], "branchPrefixes": ["feat/"], "approvalGates": "off" }`.
 * Every field has a default.
 */
export function parseUiConfig(raw: string | null): UiConfig {
  try {
    const cfg = JSON.parse(raw || '{}');
    return {
      mergeOrder: Array.isArray(cfg.mergeOrder) ? cfg.mergeOrder.filter((x: unknown) => typeof x === 'string') : [],
      branchPrefixes: strings(cfg.branchPrefixes) ?? DEFAULT_BRANCH_PREFIXES,
      approvalGates: cfg.approvalGates === 'off' ? 'off' : 'block'
    };
  } catch {
    return { mergeOrder: [], branchPrefixes: DEFAULT_BRANCH_PREFIXES, approvalGates: 'block' };
  }
}
