// The hover rules of the comment card (specs/015-comment-hover), read from the stylesheet: what hover may and may not change.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/reader.css', 'utf8');
const MARK = 'Hover on a comment or a reply (specs/015-comment-hover)';
const block = css.slice(css.indexOf(MARK));
const rule = (sel: string) => block.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'))?.[1] ?? '';

describe('the darker row (FR-001, FR-002, FR-010)', () => {
  it('has its own block in the stylesheet', () => {
    expect(css.indexOf(MARK)).toBeGreaterThan(0);
  });

  it('darkens the row of the item under the pointer or with the focus in it, on the open card only', () => {
    expect(block).toMatch(/\.sk-cm-card\.on \.sk-cm-item:hover \.sk-cm-row, \.sk-cm-card\.on \.sk-cm-item:focus-within \.sk-cm-row \{[^}]*background:/);
    // The closed card has no row of its own to darken.
    expect(block).not.toMatch(/\.sk-cm-card:not\(\.on\)[^{]*:hover/);
  });

  it('colours through tokens, no fixed colour', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
    expect(rule('.sk-cm-card.on .sk-cm-item:hover .sk-cm-row, .sk-cm-card.on .sk-cm-item:focus-within .sk-cm-row')).toContain('var(--color-text)');
  });

  it('never changes size or place on hover: only the background', () => {
    const hover = rule('.sk-cm-card.on .sk-cm-item:hover .sk-cm-row, .sk-cm-card.on .sk-cm-item:focus-within .sk-cm-row');
    for (const prop of ['padding', 'margin', 'height', 'width', 'border', 'top', 'left', 'font', 'line-height', 'display']) expect(hover, prop).not.toContain(prop + ':');
  });

  it('keeps room for the tools on the right of the row all the time, not only while hovering (FR-004)', () => {
    expect(rule('.sk-cm-card.on .sk-cm-row, .sk-cm-reply .sk-cm-row')).toMatch(/padding: 2px 40px 2px 8px/);
  });

  it('moves nothing with a transition of the background alone, and only when motion is welcome', () => {
    expect(block).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{ \.sk-cm-row \{ transition: background-color/);
    expect(block).not.toMatch(/transition: all/);
  });
});
