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
const bar = (props: Partial<Parameters<typeof HlToolbar>[0]> = {}) => renderToStaticMarkup(<HlToolbar tb={tb()} canEdit readOnly={null} viewport={{ width: 1440, height: 900 }}
  onColor={noop} onNote={noop} onCopy={noop} onAsk={noop} onDelete={noop} onClose={noop} {...props} />);
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'quoted text', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'y', note: '',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: '2026-10-21T08:00:00.000Z', ...over
});
const PHASES = [{ key: 'constitution', name: 'Constitution' }, { key: 'specify', name: 'Specify' }, { key: 'plan', name: 'Plan' }];

describe('selection toolbar (FR-003, FR-004)', () => {
  it('offers four colours in order, Note, Copy and Ask, and no Remove when creating', () => {
    const html = bar();
    expect(html).toMatch(/role="dialog" aria-label="Highlight"/);
    expect([...html.matchAll(/aria-label="Highlight (\w+)"/g)].map(m => m[1])).toEqual(['Key', 'Issue', 'Question', 'Change']);
    for (const t of ['>Note<', '>Copy<', 'Ask']) expect(html).toContain(t);
    expect(html).not.toContain('Remove highlight');
  });

  it('adds Remove and marks the colour for the author, and only Copy and Ask for others or read-only', () => {
    const own = bar({ tb: tb({ mode: 'edit', id: 'h1', color: 'p' }) });
    expect(own).toContain('aria-label="Remove highlight"');
    expect(own).toMatch(/class="sk-tb-c hl-p on"/);
    for (const html of [bar({ tb: tb({ mode: 'edit', id: 'h1' }), canEdit: false }), bar({ readOnly: 'Your token cannot commit to main.' })]) {
      expect(html).not.toMatch(/aria-label="Highlight Key"/);
      expect(html).not.toContain('>Note<');
      expect(html).toContain('>Copy<');
      expect(html).not.toContain('Remove highlight');
    }
    expect(bar({ readOnly: 'Your token cannot commit to main.' })).toContain('Your token cannot commit to main.');
  });

  it('renders the note editor with real buttons', () => {
    const html = bar({ tb: tb({ mode: 'edit', id: 'h1', noting: true, text: 'x'.repeat(120), noteText: 'n' }) });
    expect(html).toContain('x'.repeat(90) + '…');
    expect(html).toContain('placeholder="Add a note for the team…"');
    expect(html).toContain('Visible to approvers');
    expect(html).toMatch(/class="btn btn-secondary"[^>]*>Cancel</);
    expect(html).toMatch(/class="btn btn-primary"[^>]*>Save note</);
  });

  it('keeps quotes and notes as plain text (FR-007)', () => {
    const evil = '<img src=x onerror=alert(1)> **bold**';
    const html = bar({ tb: tb({ mode: 'edit', id: 'h1', noting: true, text: evil, noteText: evil }) });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<strong>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; **bold**');
  });

  it('sits 52px above the selection, flips below, and stays 8px inside the viewport', () => {
    const vp = { width: 1440, height: 900 };
    expect(toolbarPosition({ x: 500, top: 300, bottom: 320 }, false, vp)).toEqual({ left: 350, top: 248, width: 300 });
    expect(toolbarPosition({ x: 500, top: 30, bottom: 50 }, false, vp).top).toBe(60);
    expect(toolbarPosition({ x: 5, top: 300, bottom: 320 }, false, vp).left).toBe(8);
    expect(toolbarPosition({ x: 1435, top: 300, bottom: 320 }, true, vp)).toMatchObject({ left: 1440 - 320 - 8, width: 320 });
    expect(quotePreview('abc')).toBe('abc');
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
