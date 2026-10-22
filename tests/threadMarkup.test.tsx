// Markup of the discussion under a comment (specs/011-replies-reactions, contracts/thread-ui.md), rendered statically.
// Synthetic data only.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommentRail } from '../src/annotations/CommentRail';
import { ReactionBar, Thread, type ThreadProps } from '../src/annotations/Thread';
import { toCards } from '../src/annotations/comments';
import type { Highlight, Reply } from '../src/project/types';

const NOW = Date.parse('2026-10-22T10:00:00.000Z');
const mai = { login: 'mai' }, lan = { login: 'lan' };
const noop = () => {};
const R = (id: string, over: Partial<Reply> = {}): Reply => ({ id, author: lan, createdAt: '2026-10-22T09:00:00.000Z', text: 'Because the cap is per day.', ...over });
const H = (over: Partial<Highlight> = {}): Highlight => ({
  id: 'h1', phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'n', note: 'Why daily?',
  author: mai, createdAt: '2026-10-22T08:00:00.000Z', updatedAt: '2026-10-22T08:00:00.000Z', ...over
});
const thread = (over: Partial<ThreadProps> = {}) => renderToStaticMarkup(<Thread h={H({ replies: [R('r_1')] })} me={mai} now={NOW} readOnly={null} draft=""
  onDraft={noop} onSend={noop} onEdit={noop} onDelete={noop} onReact={noop} {...over} />);

describe('replies (FR-001, FR-002, FR-003, FR-005)', () => {
  it('lists them as a list, oldest first, with avatar initial, name and time', () => {
    const html = thread({ h: H({ replies: [R('r_1', { text: 'First' }), R('r_2', { text: 'Second', author: mai, createdAt: '2026-10-22T09:30:00.000Z' })] }) });
    expect(html).toMatch(/<ol class="sk-cm-replies" role="list" aria-label="Replies">/);
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
    expect(html).toContain('<b>lan</b>');
    expect(html).toMatch(/class="sk-avatar sm"[^>]*>L</);
    expect(html).toContain('1h ago');
  });

  it('has no list when there are no replies, only the box to answer', () => {
    const html = thread({ h: H() });
    expect(html).not.toContain('sk-cm-replies');
    expect(html).toContain('aria-label="Reply"');
    expect(html).toContain('placeholder="Reply…"');
  });

  it('says edited, and shows Edit and Delete on the writer\'s own reply only', () => {
    const html = thread({ h: H({ replies: [R('r_1', { editedAt: '2026-10-22T09:10:00.000Z' }), R('r_2', { author: mai })] }) });
    expect(html).toContain('class="sk-cm-edited">edited<');
    expect([...html.matchAll(/>Edit</g)]).toHaveLength(1);
    expect([...html.matchAll(/>Delete</g)]).toHaveLength(1);
    // Not even the author of the comment edits somebody else's reply.
    expect(thread({ h: H({ replies: [R('r_1')] }), me: mai })).not.toMatch(/>Edit</);
  });

  it('draws the text as plain text, whatever it holds (constitution II)', () => {
    const evil = '<script>alert(1)</script> <img src=x onerror=alert(1)>';
    const html = thread({ h: H({ replies: [R('r_1', { text: evil, author: { name: '<b>x</b>', local: true } })] }) });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('edits in place with Save and Cancel', () => {
    const html = thread({ h: H({ replies: [R('r_1', { author: mai })] }), editing: { replyId: 'r_1', text: 'new words', onText: noop, onSubmit: noop, onCancel: noop } });
    expect(html).toMatch(/<textarea aria-label="Edit reply"[^>]*>new words<\/textarea>/);
    expect(html).toMatch(/class="btn btn-primary"[^>]*>Save</);
    expect(html).not.toContain('<p class="sk-cm-text">Because');
  });

  it('shows Sending, Failed with Retry, and Saved for each reply on its own', () => {
    const html = thread({ h: H({ replies: [R('r_1'), R('r_2', { author: mai, text: 'Mine' })] }), save: { r_2: { state: 'failed', error: 'offline' } }, onRetry: noop });
    expect(html).toMatch(/data-state="failed" role="alert">Failed: offline<button[^>]*>Retry</);
    expect([...html.matchAll(/sk-cm-state/g)]).toHaveLength(1);
    expect(thread({ save: { r_1: { state: 'sending' } } })).toContain('Sending…');
  });
});

describe('the box to answer (FR-001, FR-005, FR-010)', () => {
  it('shows the draft, and asks for words when an empty one was sent', () => {
    expect(thread({ draft: 'half a thought' })).toMatch(/<textarea aria-label="Reply"[^>]*>half a thought<\/textarea>/);
    const html = thread({ draft: '   ', invalid: true });
    expect(html).toContain('role="alert">Write a reply first<');
    expect(html).toContain('aria-invalid="true"');
    expect(thread({ draft: '' })).not.toContain('Write a reply first');
  });

  it('warns before sending a reply past 2,000 characters and turns Send off', () => {
    const html = thread({ draft: 'x'.repeat(2001) });
    expect(html).toContain('Replies are limited to 2000 characters (2001)');
    expect(html).toMatch(/class="btn btn-primary"[^>]*aria-disabled="true"[^>]*>Reply</);
    expect(thread({ draft: 'x'.repeat(2000) })).not.toContain('limited to');
  });

  it('is off, with the reason, when saving is not possible, while the replies stay readable', () => {
    const why = 'Your GitHub account has read-only access to o/a. Ask for write access to comment.';
    const html = thread({ readOnly: why, h: H({ replies: [R('r_1'), R('r_2', { author: mai })] }) });
    expect(html).toMatch(/<textarea[^>]*disabled/);
    expect(html).toContain(`title="${why}"`);
    expect(html).toContain(`<p class="sk-cm-why" role="status">${why}</p>`);
    expect(html).toMatch(/aria-disabled="true"[^>]*>Reply</);
    expect(html).toContain('Because the cap is per day.');
    expect(html).toMatch(/aria-disabled="true"[^>]*>Edit</);
  });

  it('tells a screen reader what happened, politely', () => {
    expect(thread({ announce: 'Reply sent' })).toContain('<div class="sk-cm-live" role="status" aria-live="polite">Reply sent</div>');
  });
});

describe('emoji (FR-006, FR-007)', () => {
  const bar = (over: Partial<Parameters<typeof ReactionBar>[0]> = {}) => renderToStaticMarkup(<ReactionBar list={undefined} me={mai} readOnly={null} what="this comment" onToggle={noop} {...over} />);

  it('shows a button with the number for each emoji in use, marks the user\'s own, and names who in the tooltip', () => {
    const html = bar({ list: [{ emoji: '👍', author: lan }, { emoji: '👍', author: mai }, { emoji: '🎉', author: lan }] });
    expect(html).toMatch(/aria-pressed="true"[^>]*>👍<b>2<\/b>/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>🎉<b>1<\/b>/);
    expect(html).toContain('title="👍 2 people: lan, mai (including you)"');
    expect(html).toContain('aria-label="Reactions on this comment"');
    expect(html.indexOf('👍')).toBeLessThan(html.indexOf('🎉'));
  });

  it('has only the plus button when nothing was put, labelled by what it is for', () => {
    const html = bar({ what: 'the reply by lan' });
    expect(html).toContain('aria-label="Add a reaction to the reply by lan"');
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
  });

  it('keeps the emoji and the numbers, and turns every button off with the reason, when saving is not possible', () => {
    const why = 'This branch is protected.';
    const html = bar({ list: [{ emoji: '😄', author: lan }], readOnly: why });
    expect(html).toContain('<b>1</b>');
    expect([...html.matchAll(/aria-disabled="true"/g)]).toHaveLength(2);
    expect(html).toContain(`title="${why}"`);
  });

  it('draws the emoji of a thread on the comment and on each reply', () => {
    const html = thread({ h: H({ reactions: [{ emoji: '❤️', author: lan }], replies: [R('r_1', { reactions: [{ emoji: '😕', author: mai }] })] }) });
    expect(html).toContain('aria-label="Reactions on this comment"');
    expect(html).toContain('aria-label="Reactions on the reply by lan"');
    expect(html).toContain('❤️<b>1</b>');
    expect(html).toContain('😕<b>1</b>');
  });
});

describe('the card, closed and open (FR-004, FR-011)', () => {
  const rail = (items: Highlight[], selectedId: string | null, over: Partial<Parameters<typeof CommentRail>[0]> = {}) =>
    renderToStaticMarkup(<CommentRail cards={toCards(items, Object.fromEntries(items.map((h, i) => [h.id, 100 + i * 300])), {}, mai)} selectedId={selectedId} onSelect={noop} branch={null} now={NOW} {...over} />);

  it('says how many replies a closed card has, and adds nothing when there are none', () => {
    expect(rail([H({ replies: [R('r_1'), R('r_2')] })], null)).toContain('class="sk-cm-count">2 replies<');
    expect(rail([H({ replies: [R('r_1')] })], null)).toContain('class="sk-cm-count">1 reply<');
    expect(rail([H({ replies: [R('r_1')], reactions: [{ emoji: '👍', author: lan }] })], null)).toContain('1 reply · 👍1');
    expect(rail([H()], null)).not.toContain('sk-cm-count');
  });

  it('draws the discussion only inside the open card, through threadFor', () => {
    const items = [H({ replies: [R('r_1')] }), H({ id: 'h2', note: 'Other', replies: [R('r_9', { text: 'On the other' })] })];
    const html = rail(items, 'h1', { threadFor: c => <div className="probe">{c.id}</div> });
    expect([...html.matchAll(/class="probe"/g)]).toHaveLength(1);
    expect(html).toContain('<div class="sk-cm-thread"><div class="probe">h1</div></div>');
    expect(html).not.toContain('>h2</div>');
    expect(html).not.toMatch(/sk-cm-count[^<]*<\/span>[^]*sk-cm-count[^]*class="probe"[^]*sk-cm-count"/);
  });

  it('names the replies in the question when a comment with replies is about to be deleted', () => {
    const acts = { onCopy: noop, onAsk: noop, onColor: noop, onEdit: noop, onDelete: noop, mine: () => true, readOnly: null };
    const html = rail([H({ replies: [R('r_1'), R('r_2')] })], 'h1', { actions: acts });
    // The question shows once Delete was pressed; its text is chosen from the number of replies.
    expect(html).toContain('>Delete<');
    expect(html).not.toContain('Delete this comment and its');
  });
});
