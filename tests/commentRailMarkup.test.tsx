// Markup of the comment rail (specs/012-docs-style-comment-flow, contracts/comment-rail-ui.md), rendered
// statically. Synthetic data only.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommentRail, CommentSheet } from '../src/annotations/CommentRail';
import { Composer } from '../src/annotations/Composer';
import { FreshBar } from '../src/annotations/FreshBar';
import { HighlightsPanel } from '../src/annotations/HighlightsPanel';
import { toCards } from '../src/annotations/comments';
import type { HighlightActions } from '../src/annotations/highlightActions';
import type { Highlight } from '../src/project/types';

const NOW = Date.parse('2026-10-21T09:00:00.000Z');
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'n', note: 'Why daily?',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
const noop = () => {};
const acts = (over: Partial<HighlightActions> = {}): HighlightActions => ({ onCopy: noop, onAsk: noop, onEdit: noop, onDelete: noop, mine: h => 'login' in h.author && h.author.login === 'mai', readOnly: null, ...over });
const rail = (items: Highlight[], anchored: Record<string, number>, props: Partial<Parameters<typeof CommentRail>[0]> = {}) =>
  renderToStaticMarkup(<CommentRail cards={toCards(items, anchored, {}, { login: 'mai' })} selectedId={null} onSelect={noop} branch="feat/003-x" now={NOW} {...props} />);

describe('comment rail (FR-007, FR-015)', () => {
  it('is a complementary region named Comments, with a count and the branch', () => {
    const html = rail([H('h1'), H('h2', { note: 'Second' })], { h1: 100, h2: 400 });
    expect(html).toMatch(/<aside class="sk-cm-rail" role="complementary" aria-label="Comments"/);
    expect(html).toContain('Comments · 2');
    expect(html).toContain('feat/003-x');
  });

  it('does not name a branch where there is none (local, demo; FR-015)', () => {
    const html = rail([H('h1')], { h1: 100 }, { branch: null });
    expect(html).not.toContain('sk-cm-branch');
  });

  it('is not built when there is nothing to show', () => {
    expect(rail([], {})).toBe('');
    expect(rail([H('h1', { note: '' })], { h1: 10 })).toBe('');
  });

  it('draws a closed card with who, when, the quote and the note, at its place', () => {
    const html = rail([H('h1')], { h1: 100 });
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Comment by mai on “the cap applies daily”"');
    expect(html).toMatch(/class="sk-avatar sm"[^>]*>M</);
    expect(html).toContain('30 min ago');
    expect(html).toMatch(/<q class="sk-cm-quote">the cap applies daily<\/q>/);
    expect(html).toMatch(/<p class="sk-cm-note">Why daily\?<\/p>/);
    expect(html).toMatch(/style="top:\d+px;height:124px"/);
    expect(html).not.toContain('aria-current');
  });

  it('keeps cards apart: a second card close to the first sits lower', () => {
    const html = rail([H('h1'), H('h2', { createdAt: '2026-10-21T08:31:00.000Z' })], { h1: 100, h2: 110 });
    const tops = [...html.matchAll(/style="top:(\d+)px;height:(\d+)px"/g)].map(m => [Number(m[1]), Number(m[2])]);
    expect(tops).toHaveLength(2);
    expect(tops[1][0]).toBeGreaterThanOrEqual(tops[0][0] + tops[0][1] + 8);
  });

  it('lists a comment whose text is gone in its own group with the old quote (FR-010)', () => {
    const html = rail([H('h1'), H('h2', { quote: 'old wording', note: 'Was this changed?' })], { h1: 100 });
    expect(html).toContain('class="sk-cm-out"');
    expect(html).toContain('Outdated, text changed');
    expect(html).toContain('old wording');
    expect(html.indexOf('sk-cm-out')).toBeGreaterThan(html.indexOf('Why daily?'));
  });

  it('shows notes, quotes and names as plain text (constitution II, FR-004)', () => {
    const evil = '<script>alert(1)</script> <img src=x onerror=alert(1)> **bold**';
    const html = rail([H('h1', { note: evil, quote: evil, author: { login: '<b>x</b>' } })], { h1: 10 });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});


describe('composer (FR-002, FR-004, FR-005)', () => {
  const composer = (props: Partial<Parameters<typeof Composer>[0]> = {}) => renderToStaticMarkup(<Composer name="mai" quote="the cap applies daily" text="" onText={noop} onSubmit={noop} onCancel={noop} {...props} />);

  it('shows who is writing, what the comment is about, a box with a limit, and two real buttons', () => {
    const html = composer();
    expect(html).toMatch(/<article class="sk-cm-card sk-cm-draft"/);
    expect(html).toMatch(/class="sk-avatar sm"[^>]*>M</);
    expect(html).toContain('<b>mai</b>');
    expect(html).toMatch(/<q class="sk-cm-quote">the cap applies daily<\/q>/);
    expect(html).toMatch(/<textarea[^>]*maxLength="2000"[^>]*aria-label="Comment"|<textarea[^>]*aria-label="Comment"[^>]*maxLength="2000"/);
    expect(html).toContain('placeholder="Add a comment…"');
    expect(html).toMatch(/class="btn btn-secondary"[^>]*>Cancel</);
    expect(html).toMatch(/class="btn btn-primary"[^>]*>Comment</);
  });

  it('asks for text before sending nothing', () => {
    const html = composer({ invalid: true });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Write a comment first');
    expect(composer()).not.toContain('Write a comment first');
  });

  it('cannot be sent twice while saving, and shows a save error', () => {
    const html = composer({ busy: true, error: 'Your token cannot commit to main.' });
    expect(html).toMatch(/class="btn btn-primary"[^>]*disabled[^>]*>Comment</);
    expect(html).toMatch(/role="alert"[^>]*>Your token cannot commit to main\./);
  });

  it('asks before throwing away what was typed', () => {
    const html = composer({ text: 'half a thought', confirming: true });
    expect(html).toContain('Discard this comment?');
    expect(html).toMatch(/>Keep editing</);
    expect(html).toMatch(/>Discard</);
  });

  it('keeps the text, the quote and the name as plain text (constitution II)', () => {
    const evil = '<script>alert(1)</script> <img src=x onerror=alert(1)>';
    const html = composer({ text: evil, quote: evil, name: '<b>x</b>' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('selected card, announcement and sheet (FR-008, FR-009, FR-011, FR-012)', () => {
  const items = [H('h1'), H('h2', { note: 'Second', author: { login: 'lan' }, createdAt: '2026-10-21T08:40:00.000Z' }), H('h3', { note: 'Third', createdAt: '2026-10-21T08:50:00.000Z' })];
  const sel = (id: string | null, extra: Partial<Parameters<typeof CommentRail>[0]> = {}) => rail(items, { h1: 100, h2: 400, h3: 700 }, { selectedId: id, ...extra });

  it('opens exactly one card, marks it current, and keeps the others out of the tab order', () => {
    const html = sel('h2');
    expect([...html.matchAll(/aria-current="true"/g)]).toHaveLength(1);
    expect(html).toMatch(/<article class="sk-cm-card on"[^>]*aria-label="Comment by lan/);
    expect([...html.matchAll(/tabindex="0"/g)]).toHaveLength(1);
    expect([...html.matchAll(/tabindex="-1"/g)]).toHaveLength(2);
    expect(sel(null)).not.toContain('aria-current');
  });

  it('shows no colour label and no colour to choose (specs/014 FR-001), and keeps the colour on the card edge for old comments', () => {
    const html = sel('h1', { actions: acts() });
    for (const gone of ['sk-cm-meta', 'sk-cm-colors', 'sk-cm-sw', 'aria-label="Colour"', 'Mark as']) expect(html).not.toContain(gone);
    expect(html).toContain('data-color="n"');
    const old = rail([H('h1', { color: 'p' })], { h1: 100 }, { selectedId: 'h1', actions: acts() });
    expect(old).toContain('data-color="p"');
  });

  it('gives the author of the selected comment a three-dot menu for Edit and Delete, and nobody else (specs/014)', () => {
    const mine = sel('h1', { actions: acts() });
    expect(mine).toMatch(/<button[^>]*class="sk-cm-more"[^>]*aria-label="More actions"/);
    // Edit and Delete are in the menu, which is closed here, and no longer a row of buttons on the card.
    expect(mine).not.toMatch(/>Edit</);
    expect(mine).not.toMatch(/>Delete</);
    expect(mine).not.toContain('sk-cm-own');
    const theirs = sel('h2', { actions: acts() });
    expect(theirs).not.toContain('sk-cm-more');
    expect(sel('h1')).not.toContain('sk-cm-more');
  });

  it('puts the three-dot button on the open card only, in its header', () => {
    const html = sel('h1', { actions: acts() });
    expect([...html.matchAll(/class="sk-cm-more"/g)]).toHaveLength(1);
    expect(html.indexOf('sk-cm-more')).toBeLessThan(html.indexOf('class="sk-cm-quote"'));
    expect(sel(null, { actions: acts() })).not.toContain('sk-cm-more');
  });

  it('gives everyone Copy and Ask on the selected card, including a reader of somebody else\'s comment (specs/013 FR-008)', () => {
    for (const id of ['h1', 'h2']) {
      const html = sel(id, { actions: acts() });
      expect(html).toMatch(/class="sk-cm-acts sk-cm-share"/);
      expect(html).toMatch(/>Copy</);
      expect(html).toMatch(/>Ask</);
    }
    expect(sel('h1')).not.toMatch(/>Copy</);
    expect(sel('h2', { actions: acts() })).not.toMatch(/>Delete</);
  });

  it('leaves Copy and Ask on when saving is off; the menu is there, and its items are off once it is opened', () => {
    const html = sel('h1', { actions: acts({ readOnly: 'Your GitHub account has read-only access.' }) });
    expect(html).toContain('class="sk-cm-more"');
    expect(html).toMatch(/<button[^>]*>Copy<\/button>/);
    expect(html).not.toMatch(/<button[^>]*aria-disabled[^>]*>Copy</);
    expect(html).not.toMatch(/<button[^>]*aria-disabled[^>]*>Ask</);
  });

  it('edits the note in the card with a box that says Save', () => {
    const html = sel('h1', { actions: acts(), editing: { id: 'h1', text: 'Why daily?', onText: noop, onSubmit: noop, onCancel: noop } });
    expect(html).toContain('aria-label="Edit comment"');
    expect(html).toMatch(/<textarea[^>]*>Why daily\?<\/textarea>/);
    expect(html).toMatch(/class="btn btn-primary"[^>]*>Save</);
  });

  it('announces the selection politely, and says nothing when none is selected', () => {
    expect(sel('h2')).toMatch(/<div class="sk-cm-live" role="status" aria-live="polite">Comment 2 of 3 selected<\/div>/);
    expect(sel(null)).toMatch(/<div class="sk-cm-live" role="status" aria-live="polite"><\/div>/);
  });

  it('lets an outdated comment be selected like any other', () => {
    const html = rail([H('h1'), H('h2', { quote: 'old wording', note: 'Gone' })], { h1: 100 }, { selectedId: 'h2' });
    expect(html).toMatch(/class="sk-cm-out"[\s\S]*sk-cm-card on/);
    expect(html).toContain('aria-current="true"');
  });

  it('opens in a sheet at the foot of the document when there is no room for the rail', () => {
    const html = renderToStaticMarkup(<CommentSheet label="Comment" onClose={noop}><p>card here</p></CommentSheet>);
    expect(html).toMatch(/<div class="sk-cm-sheet" role="dialog" aria-label="Comment"/);
    expect(html).toContain('aria-label="Close comment"');
    expect(html).toContain('card here');
  });
});

describe('new comments by other people: badge and refresh (FR-014, FR-015)', () => {
  const NOW_MS = Date.parse('2026-10-21T09:00:00.000Z');
  const bar = (over: Partial<Parameters<typeof FreshBar>[0]> = {}) => renderToStaticMarkup(<FreshBar newCount={0} checkedAt={NOW_MS - 120_000} now={NOW_MS} onApply={noop} onRefresh={noop} {...over} />);

  it('says when it last looked and offers a refresh button, with no badge when nothing is new', () => {
    const html = bar();
    expect(html).toContain('Updated 2 min ago');
    expect(html).toMatch(/<button[^>]*aria-label="Refresh comments"[^>]*>↻ Refresh</);
    expect(html).not.toContain('New comments');
  });

  it('shows the badge with the number, as a button, when there is something new', () => {
    const html = bar({ newCount: 3 });
    expect(html).toMatch(/<button[^>]*class="sk-cm-new"[^>]*>New comments \(3\)</);
  });

  it('says it has not looked yet before the first check', () => {
    expect(bar({ checkedAt: null })).toContain('Not checked yet');
  });

  it('sits in the head of the rail and at the top of the Highlights tab', () => {
    const fresh = { newCount: 2, checkedAt: NOW_MS, now: NOW_MS, onApply: noop, onRefresh: noop };
    const railHtml = rail([H('h1')], { h1: 100 }, { fresh });
    expect(railHtml).toContain('New comments (2)');
    expect(railHtml).toContain('Updated just now');
    const panel = renderToStaticMarkup(<HighlightsPanel items={[H('h1')]} phases={[{ key: 'specify', name: 'Specify' }]} outdated={[]} onOpen={noop} fresh={fresh} />);
    expect(panel).toContain('New comments (2)');
    expect(panel).toContain('Refresh comments');
  });

  it('builds the rail for a badge alone, so the news can be seen even where nobody has commented yet', () => {
    const html = rail([], {}, { fresh: { newCount: 1, checkedAt: NOW_MS, now: NOW_MS, onApply: noop, onRefresh: noop } });
    expect(html).toContain('sk-cm-rail');
    expect(html).toContain('New comments (1)');
  });
});

describe('save states on the card (FR-013)', () => {
  const state = (s: Parameters<typeof toCards>[2][string]) => renderToStaticMarkup(<CommentRail cards={toCards([H('h1')], { h1: 100 }, { h1: s }, { login: 'mai' })} selectedId={null} onSelect={noop} branch={null} onRetry={noop} now={NOW} />);

  it('says Sending while the save runs', () => {
    expect(state({ state: 'sending' })).toMatch(/data-state="sending" role="status">Sending…</);
  });

  it('links the commit once saved on GitHub, and says where otherwise', () => {
    expect(state({ state: 'saved', commit: { sha: 'abc1234def', url: 'https://github.com/o/r/commit/abc1234def' } })).toMatch(/Saved · <a href="https:\/\/github.com\/o\/r\/commit\/abc1234def"[^>]*>commit abc1234</);
    expect(state({ state: 'saved', where: 'folder' })).toContain('Saved to folder');
    expect(state({ state: 'saved', where: 'browser' })).toContain('Saved in this browser');
  });

  it('gives the reason and a Retry button when it failed, as an alert', () => {
    const html = state({ state: 'failed', error: 'Your token cannot commit to main.' });
    expect(html).toMatch(/data-state="failed" role="alert">Failed: Your token cannot commit to main\.<button[^>]*>Retry</);
  });

  it('says nothing for a comment that has not been touched', () => {
    expect(state({ state: 'idle' })).not.toContain('sk-cm-state');
  });
});
