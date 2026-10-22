// Markup of the highlight components (specs/010-spec-annotations contracts/annotations-ui.md),
// rendered statically, plus their pure helpers. Synthetic data only.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HlToolbar, quotePreview, toolbarPosition, type ToolbarState } from '../src/annotations/Toolbar';
import { HighlightsPanel } from '../src/annotations/HighlightsPanel';
import { briefNotes, pendingTarget, relTime } from '../src/annotations/brief';
import { GateBrief } from '../src/copilot/Copilot';
import { App } from '../src/App';
import { ConsentDialog, SavedToast } from '../src/annotations/Annotator';
import type { Highlight } from '../src/project/types';

const noop = () => {};
const tb = (over: Partial<ToolbarState> = {}): ToolbarState => ({ mode: 'new', text: 'the cap applies daily', x: 500, top: 300, bottom: 320, ...over });
const bar = (props: Partial<Parameters<typeof HlToolbar>[0]> = {}) => renderToStaticMarkup(<HlToolbar tb={tb()} readOnly={null} viewport={{ width: 1440, height: 900 }} onComment={noop} {...props} />);
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'quoted text', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'y', note: '',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: '2026-10-21T08:00:00.000Z', ...over
});
const PHASES = [{ key: 'constitution', name: 'Constitution' }, { key: 'specify', name: 'Specify' }, { key: 'plan', name: 'Plan' }];

describe('selection popup: one Comment button (specs/013 FR-001, FR-004, FR-005, FR-006, FR-009)', () => {
  it('has one button, named Comment, with a bubble icon, and nothing else', () => {
    const html = bar();
    expect(html).toMatch(/role="dialog" aria-label="Comment"/);
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*class="sk-tb-b"[^>]*aria-label="Comment"[^>]*><svg[^>]*>.*<\/svg>Comment<\/button>/);
    for (const gone of ['Add comment', 'sk-tb-c', 'aria-label="Highlight', '>Copy<', 'Ask', 'Remove highlight', '<textarea', 'sk-tb-note', '>Note<']) expect(html).not.toContain(gone);
    expect(html).not.toContain('aria-disabled');
    expect(html).not.toContain('sk-tb-msg');
  });

  it('is the same one button when it opens on a highlight of yours that has only a colour', () => {
    const html = bar({ tb: tb({ mode: 'edit', id: 'h1' }) });
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
    expect(html).toContain('>Comment<');
  });

  it('turns Comment off with the reason shown when saving is not possible', () => {
    const reason = 'Your GitHub account has read-only access to o/a. Ask for write access to comment.';
    const html = bar({ readOnly: reason });
    expect(html).toMatch(/<button[^>]*aria-disabled="true"/);
    expect(html).toContain(`title="${reason}"`);
    expect(html).toMatch(/<div class="sk-tb-msg" role="status">Your GitHub account has read-only access/);
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
  });

  it('shows a failed save under the button', () => {
    expect(bar({ error: 'Not saved: branch is protected.' })).toContain('role="status">Not saved: branch is protected.<');
  });

  it('uses theme tokens only: no inline colours', () => {
    expect(bar()).not.toMatch(/style="[^"]*(#|rgb)/);
  });
});

describe('selection popup position (specs/013 FR-002, SC-003)', () => {
  const vp = { width: 1440, height: 900 };

  it('sits 44px above the selection, flips below it, and stays 8px inside the viewport', () => {
    expect(toolbarPosition({ x: 500, top: 300, bottom: 320 }, vp)).toEqual({ left: 434, top: 256 });
    expect(toolbarPosition({ x: 500, top: 30, bottom: 50 }, vp).top).toBe(60);
    expect(toolbarPosition({ x: 5, top: 300, bottom: 320 }, vp).left).toBe(8);
    expect(toolbarPosition({ x: 1435, top: 300, bottom: 320 }, vp).left).toBe(1440 - 132 - 8);
    expect(quotePreview('abc')).toBe('abc');
  });

  it('is wider, and says so, when a line of explanation sits under the button', () => {
    expect(toolbarPosition({ x: 500, top: 300, bottom: 320 }, vp, true)).toEqual({ left: 370, top: 256, width: 260 });
  });

  it('fits a 320px phone, with or without the line of explanation', () => {
    const phone = { width: 320, height: 640 };
    for (const x of [0, 160, 320]) {
      const p = toolbarPosition({ x, top: 300, bottom: 320 }, phone);
      expect(p.left).toBeGreaterThanOrEqual(8);
      expect(p.left + 132).toBeLessThanOrEqual(320 - 8);
      const q = toolbarPosition({ x, top: 300, bottom: 320 }, phone, true);
      expect(q.left).toBeGreaterThanOrEqual(8);
      expect(q.left + (q.width as number)).toBeLessThanOrEqual(320 - 8);
    }
  });
});

describe('Highlights panel (FR-019 – FR-021)', () => {
  const items = [H('h1', { color: 'p', note: 'Must fix <script>x</script>' }), H('h2', { phase: 'plan', color: 'b' }), H('h3', { phase: 'specify', color: 'y' })];

  it('filters by colour with counts, groups by step in order, and marks Outdated', () => {
    const html = renderToStaticMarkup(<HighlightsPanel items={items} phases={PHASES} outdated={['h3']} onOpen={noop} now={Date.parse('2026-10-21T11:00:00Z')} />);
    expect(html).toContain('All <b>3</b>');
    expect(html).toMatch(/hl-p"><\/i>Issue <b>1<\/b>/);
    expect(html.indexOf('02 · Specify')).toBeLessThan(html.indexOf('03 · Plan'));
    expect(html).toContain('Outdated, text changed');
    expect(html).toContain('mai · Issue · 3h ago');
    expect(html).not.toContain('<script>');
  });

  it('has a Comment filter for plain comments after the four colours, with its count and name (spec 012)', () => {
    const plain = [...items, H('h4', { color: 'n', note: 'Why daily?' }), H('h5', { color: 'n', note: '' })];
    const html = renderToStaticMarkup(<HighlightsPanel items={plain} phases={PHASES} outdated={[]} onOpen={noop} now={Date.parse('2026-10-21T11:00:00Z')} />);
    expect(html).toContain('All <b>5</b>');
    expect(html).toMatch(/hl-n"><\/i>Comment <b>2<\/b>/);
    expect(html.indexOf('Change <b>')).toBeLessThan(html.indexOf('Comment <b>'));
    expect(html).toContain('mai · Comment · 3h ago');
    expect(html).toContain('sk-hlp-bar hl-n-solid');
  });

  it('says how to start when empty, and shows the consent switch only when given', () => {
    const empty = renderToStaticMarkup(<HighlightsPanel items={[]} phases={PHASES} outdated={[]} onOpen={noop} />);
    expect(empty).toContain('Select text in any artifact to highlight it or leave a note for the team.');
    expect(empty).not.toContain('Ask before committing highlights');
    expect(renderToStaticMarkup(<HighlightsPanel items={[]} phases={PHASES} outdated={[]} onOpen={noop} ask={{ on: true, set: noop }} />)).toContain('Ask before committing highlights');
  });
});

describe('"Before you approve" notes (FR-022)', () => {
  it('lists the notes of one step, Issue first, as plain text', () => {
    const items = [H('a', { note: 'key note' }), H('b', { color: 'p', note: 'issue note', createdAt: '2026-10-21T09:00:00.000Z' }), H('c', { phase: 'plan', note: 'other step' }), H('d')];
    expect(briefNotes(items, 'specify')).toEqual(['mai: issue note', 'mai: key note']);
    const html = renderToStaticMarkup(<GateBrief items={briefNotes([H('e', { note: '<b>x</b>' })], 'specify')} onAsk={noop} />);
    expect(html).toContain('mai: &lt;b&gt;x&lt;/b&gt;');
  });

  it('puts plain comments after Issue notes and before the other colours (spec 012 FR-003)', () => {
    const items = [
      H('a', { color: 'y', note: 'key note', createdAt: '2026-10-21T08:00:00.000Z' }),
      H('b', { color: 'n', note: 'plain note', createdAt: '2026-10-21T08:30:00.000Z' }),
      H('c', { color: 'p', note: 'issue note', createdAt: '2026-10-21T09:00:00.000Z' })
    ];
    const html = renderToStaticMarkup(<GateBrief items={briefNotes(items, 'specify')} onAsk={noop} />);
    expect(html.indexOf('issue note')).toBeLessThan(html.indexOf('plain note'));
    expect(html.indexOf('plain note')).toBeLessThan(html.indexOf('key note'));
  });

  it('does not block or approve gates: highlight code never touches the gate API', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(n => statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]);
    for (const f of files('src/annotations')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/trackingApi|\/api\/gates|decide\(/);
  });
});

describe('helpers', () => {
  it('relTime and pendingTarget', () => {
    const now = Date.parse('2026-10-21T12:00:00Z');
    expect(relTime('2026-10-21T11:59:40Z', now)).toBe('Just now');
    expect(relTime('2026-10-21T11:48:00Z', now)).toBe('12 min ago');
    expect(relTime('2026-10-02T09:00:00Z', now)).toBe('Oct 2');
    const t = { slug: '010-x', branch: 'main', phase: 'specify' };
    expect(pendingTarget(t, t)).toBe('same');
    expect(pendingTarget(t, { ...t, phase: 'plan' })).toBe('moved');
  });
});

describe('demo shell (FR-018, design)', () => {
  it('has three right tabs with the Highlights count and pins for notes after mount', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('class="sk-rtabs is-3"');
    expect(html).toMatch(/>Highlights<span class="sk-rtab-n">4<\/span>/);
    expect(html).toMatch(/>Gate</);
  });
});

describe('commit consent and toast (FR-009a)', () => {
  it('names the branch and login, and links the commit', () => {
    const d = renderToStaticMarkup(<ConsentDialog branch="feat/010-x" login="mai" onCancel={noop} onAccept={noop} />);
    expect(d).toContain('Commit highlights?');
    expect(d).toContain('<code>feat/010-x</code> as mai');
    expect(d).toMatch(/>Cancel</);
    expect(d).toMatch(/>Commit highlights</);
    const t = renderToStaticMarkup(<SavedToast sha="abcdef1234" url="https://github.com/o/r/commit/abcdef1234" />);
    expect(t).toContain('role="status"');
    expect(t).toContain('commit abcdef1');
  });
});
