// The bar of changes waiting to be saved (specs/016-deferred-save, contracts/save-bar-ui.md), rendered statically. Synthetic data only.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SaveBar } from '../src/annotations/SaveBar';

const noop = () => {};
const bar = (over: Partial<Parameters<typeof SaveBar>[0]> = {}) => renderToStaticMarkup(<SaveBar count={3} onSave={noop} onDiscard={noop} {...over} />);

describe('SaveBar', () => {
  it('says how many changes wait, with Save and Discard', () => {
    const html = bar();
    expect(html).toContain('role="status"');
    expect(html).toContain('<b>3 changes</b> not saved');
    expect(html).toMatch(/<button[^>]*>Save<\/button>/);
    expect(html).toMatch(/<button[^>]*>Discard<\/button>/);
  });

  it('says "1 change" for one', () => {
    expect(bar({ count: 1 })).toContain('<b>1 change</b> not saved');
  });

  it('draws nothing when nothing waits, here or elsewhere', () => {
    expect(bar({ count: 0 })).toBe('');
  });

  it('says what waits in other specs, with no buttons when nothing waits here', () => {
    expect(bar({ count: 0, elsewhere: 2 })).toContain('2 unsaved in other specs');
    expect(bar({ count: 0, elsewhere: 2 })).not.toContain('Save');
    expect(bar({ elsewhere: 1 })).toContain('1 unsaved in other specs');
  });

  it('says Saving… and turns both buttons off while it saves', () => {
    const html = bar({ saving: true });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Saving…<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Discard<\/button>/);
  });

  it('keeps the changes and says why a save did not work, with Retry in place of Save', () => {
    const html = bar({ error: 'GitHub is down' });
    expect(html).toContain('role="alert">GitHub is down<');
    expect(html).toMatch(/>Retry<\/button>/);
    expect(html).not.toMatch(/>Save<\/button>/);
  });

  it('turns Save off with the reason when saving is off', () => {
    const html = bar({ readOnly: 'Your GitHub account has read-only access.' });
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*title="Your GitHub account has read-only access\."[^>]*>Save<\/button>/);
  });

  it('warns that the changes are lost with the tab when the browser could not keep them', () => {
    expect(bar({ persistent: false })).toContain('only in this tab and are lost if you close it');
    expect(bar({ persistent: true })).not.toContain('only in this tab');
  });
});

describe('the bar in CSS', () => {
  const css = readFileSync('src/styles/reader.css', 'utf8');
  const tail = css.slice(css.indexOf('The bar of changes waiting to be saved'));

  it('uses tokens only, no corner, and 44 px buttons on a touch screen', () => {
    expect(tail).not.toContain('border-radius');
    expect(tail).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(tail).toMatch(/@media \(pointer: coarse\) \{ \.sk-savebar \.btn \{ min-height: 44px; \} \}/);
  });
});

describe('the bar in the main column (specs/016)', () => {
  const css = readFileSync('src/styles/reader.css', 'utf8');
  it('gets its own row, so the document keeps the flexible one', () => {
    expect(css).toMatch(/\.sk-main\.has-savebar \{ grid-template-rows: auto auto auto minmax\(0, 1fr\) auto; \}/);
    expect(readFileSync('src/styles/workspace.css', 'utf8')).toMatch(/\.sk-main\{display:grid;grid-template-rows:auto auto minmax\(0,1fr\) auto/);
  });
});
