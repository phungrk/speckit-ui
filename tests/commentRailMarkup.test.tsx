// Markup of the comment rail (specs/012-docs-style-comment-flow, contracts/comment-rail-ui.md), rendered
// statically. Synthetic data only.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommentRail, CommentSheet } from '../src/annotations/CommentRail';
import { Composer } from '../src/annotations/Composer';
import { HlToolbar, type ToolbarState } from '../src/annotations/Toolbar';
import { toCards } from '../src/annotations/comments';
import type { Highlight } from '../src/project/types';

const NOW = Date.parse('2026-10-21T09:00:00.000Z');
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'n', note: 'Why daily?',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
const noop = () => {};
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

const tb = (over: Partial<ToolbarState> = {}): ToolbarState => ({ mode: 'new', text: 'the cap applies daily', x: 500, top: 300, bottom: 320, ...over });
const bar = (props: Partial<Parameters<typeof HlToolbar>[0]> = {}) => renderToStaticMarkup(<HlToolbar tb={tb()} canEdit readOnly={null} viewport={{ width: 1440, height: 900 }}
  onColor={noop} onComment={noop} onCopy={noop} onAsk={noop} onDelete={noop} {...props} />);

describe('selection toolbar: Add comment first (FR-001, FR-006, FR-016)', () => {
  it('leads with Add comment, then the four colours, then Copy and Ask, and has no Note for a new selection', () => {
    const html = bar();
    expect(html).toMatch(/<button[^>]*class="sk-tb-b sk-tb-primary"[^>]*aria-label="Add comment"[^>]*>Add comment</);
    expect(html).not.toContain('>Note<');
    const at = (s: string) => html.indexOf(s);
    expect(at('Add comment')).toBeGreaterThan(-1);
    expect(at('aria-label="Highlight Key"')).toBeGreaterThan(at('Add comment'));
    expect(at('aria-label="Highlight Change"')).toBeGreaterThan(at('aria-label="Highlight Key"'));
    expect(at('>Copy<')).toBeGreaterThan(at('aria-label="Highlight Change"'));
    expect(at('Ask')).toBeGreaterThan(at('>Copy<'));
    expect(html).not.toContain('aria-disabled');
  });

  it('lets the author of a colour-only highlight add a comment to it, and recolour or remove it', () => {
    const own = bar({ tb: tb({ mode: 'edit', id: 'h1', color: 'p' }), canComment: true });
    expect(own).toContain('Add comment');
    expect(own).toContain('aria-label="Remove highlight"');
    expect(own).not.toContain('>Note<');
    // A highlight that already has a note is commented on its card, so the toolbar does not offer it again.
    expect(bar({ tb: tb({ mode: 'edit', id: 'h1', color: 'p' }), canComment: false })).not.toContain('Add comment');
    expect(own).toMatch(/class="sk-tb-c hl-p on"/);
    // A plain comment is none of the four swatches, so none is marked.
    expect(bar({ tb: tb({ mode: 'edit', id: 'h1', color: 'n' }) })).not.toMatch(/class="sk-tb-c hl-\w+ on"/);
  });

  it('turns Add comment off with the reason shown and keeps Copy and Ask when saving is not possible', () => {
    const reason = 'Your GitHub account has read-only access to o/a. Ask for write access to comment.';
    const html = bar({ readOnly: reason });
    expect(html).toMatch(/aria-disabled="true"/);
    expect(html).toContain(`title="${reason}"`);
    expect(html).toMatch(/<div class="sk-tb-msg" role="status">Your GitHub account has read-only access/);
    expect(html).toContain('>Copy<');
    expect(html).toContain('Ask');
    expect(html).not.toContain('aria-label="Highlight Key"');
  });

  it('gives somebody else\'s comment only Copy and Ask, with no Add comment', () => {
    const html = bar({ tb: tb({ mode: 'edit', id: 'h1' }), canEdit: false });
    expect(html).not.toContain('Add comment');
    expect(html).toContain('>Copy<');
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

  it('shows which colour the selected comment has', () => {
    expect(sel('h1')).toContain('class="sk-cm-meta"');
    expect(sel('h1')).toContain('Comment</div>');
    expect(sel(null)).not.toContain('sk-cm-meta');
  });

  it('gives the author of the selected comment colours, Edit and Delete, and nobody else', () => {
    const mine = sel('h1', { actions: { onColor: noop, onEdit: noop, onDelete: noop } });
    expect(mine).toContain('aria-label="Colour"');
    expect([...mine.matchAll(/aria-label="Mark as (\w+)"/g)].map(m => m[1])).toEqual(['Comment', 'Key', 'Issue', 'Question', 'Change']);
    expect(mine).toContain('aria-pressed="true"');
    expect(mine).toMatch(/>Edit</);
    expect(mine).toMatch(/>Delete</);
    const theirs = sel('h2', { actions: { onColor: noop, onEdit: noop, onDelete: noop } });
    expect(theirs).not.toContain('aria-label="Colour"');
    expect(theirs).not.toMatch(/>Edit</);
    expect(theirs).not.toMatch(/>Delete</);
    expect(sel('h1')).not.toMatch(/>Edit</);
  });

  it('edits the note in the card with a box that says Save', () => {
    const html = sel('h1', { actions: { onColor: noop, onEdit: noop, onDelete: noop }, editing: { id: 'h1', text: 'Why daily?', onText: noop, onSubmit: noop, onCancel: noop } });
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

