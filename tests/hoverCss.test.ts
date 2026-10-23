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

  it('darkens the row of the item under the pointer or with the focus in it, on open and closed cards', () => {
    expect(block).toMatch(/\.sk-cm-item:hover \.sk-cm-row, \.sk-cm-item:focus-within \.sk-cm-row \{[^}]*background:/);
  });

  it('on a closed card the row grows as paint only (shadow) and makes room for the button on hover', () => {
    const r = rule('.sk-cm-card:not(.on) .sk-cm-item:hover .sk-cm-row, .sk-cm-card:not(.on) .sk-cm-item:focus-within .sk-cm-row');
    expect(r).toMatch(/box-shadow: 0 0 0 4px color-mix/);
    expect(r).toContain('padding-right: 36px');
    expect(r).not.toMatch(/margin|height|border/);
  });

  it('colours through tokens, no fixed colour', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
    expect(rule('.sk-cm-item:hover .sk-cm-row, .sk-cm-item:focus-within .sk-cm-row')).toContain('var(--color-text)');
  });

  it('never changes size or place on hover: only the background', () => {
    const hover = rule('.sk-cm-item:hover .sk-cm-row, .sk-cm-item:focus-within .sk-cm-row');
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

describe('the floating emoji button (FR-003, FR-009, FR-010, FR-011)', () => {
  const float = css.slice(css.indexOf('The floating emoji button (specs/015)'));

  it('is the one round element of the card: exactly one border-radius, on the button, and it is a circle', () => {
    const radii = [...block.matchAll(/border-radius:\s*([^;}]+)/g)].map(m => m[1].trim());
    expect(radii).toEqual(['50%']);
    expect(float.match(/\.sk-cm-float \{[^}]*border-radius: 50%/)).not.toBeNull();
  });

  it('is light, shadowed and drawn from tokens', () => {
    const rules = float.match(/\.sk-cm-float \{([^}]*)\}/)![1];
    expect(rules).toContain('var(--color-bg)');
    expect(rules).toContain('var(--shadow-md)');
    expect(rules).toContain('var(--color-divider)');
    expect(float).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('is hidden at rest by opacity, not removed, and shows with the pointer, the focus or an open picker', () => {
    expect(float).toMatch(/\.sk-cm-float-wrap \{[^}]*opacity: 0; pointer-events: none/);
    expect(float).toMatch(/\.sk-cm-item:hover \.sk-cm-float-wrap, \.sk-cm-item:focus-within \.sk-cm-float-wrap, \.sk-cm-float-wrap\.open \{[^}]*opacity: 1/);
    expect(float).not.toMatch(/\.sk-cm-float-wrap \{[^}]*display: none/);
  });

  it('does not use a transform, which would break the fixed picker inside it', () => {
    expect(float.match(/\.sk-cm-float-wrap \{([^}]*)\}/)![1]).not.toContain('transform');
  });

  it('shows on a screen with no hover, on closed cards too (specs/017), at 44 px', () => {
    expect(float).toMatch(/@media \(hover: none\), \(pointer: coarse\) \{[^@]*\.sk-cm-float-wrap \{ opacity: 1; pointer-events: auto; \}[^@]*\.sk-cm-float \{ width: 44px; height: 44px; \}/);
    expect(float).not.toMatch(/@media \(hover: none\)[^@]*\.sk-cm-card\.on \.sk-cm-float-wrap/);
  });

  it('keeps the row room on a touch screen above the open-card row rule (same or higher specificity)', () => {
    expect(float).toMatch(/\.sk-cm-card \.sk-cm-row, \.sk-cm-card\.on \.sk-cm-row, \.sk-cm-reply \.sk-cm-row \{ min-height: 52px; padding-right: 60px; \}/);
  });

  it('places the picker with fixed position, square', () => {
    const picker = float.match(/\.sk-cm-picker \{([^}]*)\}/)![1];
    expect(picker).toContain('position: fixed');
    expect(picker).not.toContain('border-radius');
  });
});


describe('three dots reveal (specs/015, US3)', () => {
  const dots = block.slice(block.indexOf('Three dots show only'));

  it('is transparent at rest but stays in the tab order (no display/visibility)', () => {
    expect(dots).toMatch(/\.sk-cm-more \{ opacity: 0; \}/);
    expect(dots.split('@media')[0]).not.toMatch(/display: none|visibility: hidden/);
  });

  it('shows on hover, focus within or an open menu', () => {
    expect(dots).toContain('.sk-cm-item:hover .sk-cm-more');
    expect(dots).toContain('.sk-cm-item:focus-within .sk-cm-more');
    expect(dots).toContain('.sk-cm-more[aria-expanded="true"]');
  });

  it('is always shown on a screen with no hover', () => {
    expect(dots).toMatch(/@media \(hover: none\), \(pointer: coarse\) \{\s*\.sk-cm-more \{ opacity: 1; \}/);
  });
});

describe('emoji under the text (specs/017)', () => {
  const m17 = css.slice(css.indexOf('Emoji under the text of the comment'));

  it('is appended after the 015 blocks, with no corner and no fixed colour', () => {
    expect(css.indexOf('Emoji under the text of the comment')).toBeGreaterThan(css.indexOf('Three dots show only'));
    expect(m17).not.toContain('border-radius');
    expect(m17).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});

describe('the header of a closed card (specs/017 FR-008)', () => {
  const tail = css.slice(css.indexOf('The header of a closed card holds'));

  it('lets the name give way (ellipsis) and never wraps the count, the time or the three dots', () => {
    expect(tail).toMatch(/\.sk-cm-who b \{[^}]*overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/);
    expect(tail).toMatch(/\.sk-cm-who \.sk-cm-time, \.sk-cm-who \.sk-cm-count, \.sk-cm-who \.sk-cm-more-wrap \{ flex: none; \}/);
    expect(tail).not.toContain('border-radius');
  });
});
