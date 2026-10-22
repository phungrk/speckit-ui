// Markup of the comment rail (specs/012-docs-style-comment-flow, contracts/comment-rail-ui.md), rendered
// statically. Synthetic data only.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommentRail } from '../src/annotations/CommentRail';
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
    expect(html).toMatch(/style="top:\d+px"/);
    expect(html).not.toContain('aria-current');
  });

  it('keeps cards apart: a second card close to the first sits lower', () => {
    const html = rail([H('h1'), H('h2', { createdAt: '2026-10-21T08:31:00.000Z' })], { h1: 100, h2: 110 });
    const tops = [...html.matchAll(/style="top:(\d+)px"/g)].map(m => Number(m[1]));
    expect(tops).toHaveLength(2);
    expect(tops[1]).toBeGreaterThanOrEqual(tops[0] + 96 + 8);
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
