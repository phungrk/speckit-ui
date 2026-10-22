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
const acts = (over: Partial<HighlightActions> = {}): HighlightActions => ({ onCopy: noop, onAsk: noop, onEdit: noop, onDelete: noop, mine: h => 'login' in h.author && h.author.login === 'mai', readOnly: null, ...over });
const phases = [{ key: 'specify', name: 'Specify' }];
const panel = (items: Highlight[], actions?: HighlightActions | null) =>
  renderToStaticMarkup(<HighlightsPanel items={items} phases={phases} outdated={[]} onOpen={noop} actions={actions} now={Date.parse('2026-10-21T09:00:00.000Z')} />);

describe('Highlights tab entries', () => {
  it('shows an entry as a button next to its actions, never nested in it', () => {
    const html = panel([H('h1')], acts());
    expect(html).toMatch(/<div class="sk-hlp-row"><button type="button" class="sk-hlp-item"/);
    expect(html).not.toMatch(/<button[^>]*sk-hlp-item[^>]*>(?:(?!<\/button>).)*<button/s);
  });

  it('opens no actions until an entry is clicked, and tells a screen reader the entry can expand (colour-only entries with actions)', () => {
    const html = panel([H('h1'), H('h2', { note: 'A note' })], acts());
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

  it('gives the author Copy, Ask and Delete, and no colour to choose (specs/014)', () => {
    const html = row(H('h1', { color: 'b' }), acts());
    expect(html).not.toContain('aria-label="Colour"');
    expect(html).not.toContain('Mark as');
    for (const label of ['Copy', 'Ask', 'Delete']) expect(html).toContain('>' + label + '<');
    expect(html).not.toContain('Edit');
  });

  it("gives somebody else's highlight Copy and Ask only", () => {
    const html = row(H('h2', { author: { login: 'lan' } }), acts());
    expect(html).not.toContain('aria-label="Colour"');
    expect(html).not.toContain('>Delete<');
    expect(html).toContain('>Copy<');
    expect(html).toContain('>Ask<');
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
