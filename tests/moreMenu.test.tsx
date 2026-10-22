// The three-dot button and its menu (specs/014-comment-card-menu, contracts/card-menu-ui.md), rendered statically.
// Keys, closing by a click outside and the one-menu-at-a-time rule are checked in the browser (quickstart 5, 6).
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MenuList, MoreMenu } from '../src/annotations/MoreMenu';

const noop = () => {};
const items = [{ key: 'edit', label: 'Edit', onSelect: noop }, { key: 'delete', label: 'Delete', onSelect: noop }];

describe('the three-dot button', () => {
  it('is one button named More actions that has a menu and starts closed', () => {
    const html = renderToStaticMarkup(<MoreMenu items={items} />);
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
    expect(html).toContain('aria-label="More actions"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="menu"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('can be named for what it is on', () => {
    expect(renderToStaticMarkup(<MoreMenu label="Reply actions" items={items} />)).toContain('aria-label="Reply actions"');
  });
});

describe('the menu', () => {
  it('has Edit and Delete as menu items, in that order', () => {
    const html = renderToStaticMarkup(<MenuList items={items} onPick={noop} />);
    expect(html).toContain('role="menu"');
    expect([...html.matchAll(/role="menuitem"[^>]*>([^<]+)</g)].map(m => m[1])).toEqual(['Edit', 'Delete']);
    expect(html).not.toContain('aria-disabled');
  });

  it('turns an item off, with the reason, when saving is not possible', () => {
    const why = 'Your GitHub account has read-only access to o/a. Ask for write access to comment.';
    const html = renderToStaticMarkup(<MenuList items={items.map(i => ({ ...i, disabledReason: why }))} onPick={noop} />);
    expect([...html.matchAll(/aria-disabled="true"/g)]).toHaveLength(2);
    expect([...html.matchAll(new RegExp(`title="${why}"`, 'g'))]).toHaveLength(2);
  });

  it('keeps the items out of the tab order; arrows move between them', () => {
    expect([...renderToStaticMarkup(<MenuList items={items} onPick={noop} />).matchAll(/tabindex="-1"/g)]).toHaveLength(2);
  });

  it('is placed from the button, fixed, so a clipped card does not clip it', () => {
    const html = renderToStaticMarkup(<MenuList items={items} onPick={noop} style={{ left: 40, top: 60, width: 140 }} />);
    expect(html).toContain('style="left:40px;top:60px;width:140px"');
    const css = readFileSync('src/styles/reader.css', 'utf8');
    expect(css).toMatch(/\.sk-cm-menu \{[^}]*position: fixed/);
  });

  it('uses theme tokens and no corners', () => {
    const css = readFileSync('src/styles/reader.css', 'utf8');
    const rules = css.slice(css.indexOf('Three-dot button and its menu'));
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(rules).not.toMatch(/border-radius/);
    expect(rules).toContain('var(--shadow-md)');
  });
});
