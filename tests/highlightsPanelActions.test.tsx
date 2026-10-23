// Actions of the Highlights tab for a highlight that has only a colour (specs/013 FR-008, contracts/selection-popup-ui.md).
// Rendered statically; an entry's actions open on click, so the open state is checked in the browser (quickstart 10).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EntryActions, HighlightsPanel } from '../src/annotations/HighlightsPanel';
import type { HighlightActions } from '../src/annotations/highlightActions';
import type { Highlight } from '../src/project/types';

const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'y', note: '',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
const noop = () => {};
const acts = (over: Partial<HighlightActions> = {}): HighlightActions => ({ onEdit: noop, onDelete: noop, mine: h => 'login' in h.author && h.author.login === 'mai', readOnly: null, ...over });
const phases = [{ key: 'specify', name: 'Specify' }];
const panel = (items: Highlight[], actions?: HighlightActions | null) =>
  renderToStaticMarkup(<HighlightsPanel items={items} phases={phases} outdated={[]} onOpen={noop} actions={actions} now={Date.parse('2026-10-21T09:00:00.000Z')} />);

describe('Highlights tab entries', () => {
  it('shows an entry as a button next to its actions, never nested in it', () => {
    const html = panel([H('h1')], acts());
    expect(html).toMatch(/<div class="sk-hlp-row"><button type="button" class="sk-hlp-item"/);
    expect(html).not.toMatch(/<button[^>]*sk-hlp-item[^>]*>(?:(?!<\/button>).)*<button/s);
  });

  it('opens no actions until an entry is clicked; only your own colour-only entry can expand, and says so (specs/014 U1)', () => {
    const html = panel([H('h1'), H('h2', { note: 'A note' }), H('h3', { author: { login: 'lan' } })], acts());
    expect(html).not.toContain('sk-hlp-acts');
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(1);
  });

  it('has no expandable entries without actions (the Annotator is gone): null hides them', () => {
    const html = panel([H('h1')], null);
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('sk-hlp-acts');
  });
});

describe('actions under an open entry', () => {
  const row = (h: Highlight, a: HighlightActions, confirming = false) => renderToStaticMarkup(<EntryActions h={h} actions={a} confirming={confirming} onConfirm={noop} onDeleted={noop} />);

  it('gives the author Delete and nothing else: no colour to choose, no Copy, no Ask (specs/014 FR-009)', () => {
    const html = row(H('h1', { color: 'b' }), acts());
    expect(html).toContain('>Delete<');
    for (const gone of ['aria-label="Colour"', 'Mark as', '>Copy<', '>Ask<', 'Edit']) expect(html).not.toContain(gone);
  });

  it('gives somebody else\'s highlight no actions at all', () => {
    expect(row(H('h2', { author: { login: 'lan' } }), acts())).toBe('');
  });

  it('asks before deleting', () => {
    const html = row(H('h1'), acts(), true);
    expect(html).toContain('Delete this highlight?');
    expect(html).toContain('>Keep<');
    expect(html).not.toContain('>Copy<');
  });

  it('turns the writing actions off with the reason and keeps Copy and Ask', () => {
    const why = 'This branch is protected.';
    const html = row(H('h1'), acts({ readOnly: why }));
    expect([...html.matchAll(/aria-disabled="true"/g)]).toHaveLength(1);
    expect(html).toContain(`title="${why}"`);
    expect(html).toContain(`role="status">${why}<`);
    expect(html).not.toMatch(/<button[^>]*aria-disabled[^>]*>(Copy|Ask)</);
  });
});

describe('the bar of changes waiting to be saved at the top of the tab (specs/016)', () => {
  it('shows what it is given before everything else, and nothing when it is not given', () => {
    const withBar = renderToStaticMarkup(<HighlightsPanel items={[H('h1')]} phases={phases} outdated={[]} onOpen={noop} saveBar={<div className="probe">bar</div>} now={Date.parse('2026-10-21T09:00:00.000Z')} />);
    expect(withBar).toContain('<div class="sk-hlp"><div class="probe">bar</div>');
    expect(panel([H('h1')])).not.toContain('probe');
  });
});
