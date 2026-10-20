// Markup of the reading-mode controls and the shells (specs/010 contracts §4–6), rendered statically.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { AaButton, ReaderPanel, SidebarToggle, isOutside } from '../src/reader/ReaderControls';
import { DEFAULT_READER } from '../src/reader/settings';
import { LocalStageContent } from '../src/project/LocalWorkspace';
import { buildLocalProject } from '../src/project/localProject';

const noop = () => {};
const panel = (size = DEFAULT_READER.size) => renderToStaticMarkup(<ReaderPanel reader={{ ...DEFAULT_READER, size }} onChange={noop} onReset={noop} onClose={noop} />);
const button = (html: string, label: string) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';

describe('Aa button and popover (contracts §4–5)', () => {
  it('labels the Aa button for screen readers', () => {
    const html = renderToStaticMarkup(<AaButton open={false} onToggle={noop} />);
    expect(html).toContain('aria-label="Reading settings"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(renderToStaticMarkup(<AaButton open onToggle={noop} />)).toContain('aria-expanded="true"');
  });

  it('renders the five sections for the default settings', () => {
    const html = panel();
    expect(html).toMatch(/role="dialog"[^>]*aria-label="Reading settings"|aria-label="Reading settings"[^>]*role="dialog"/);
    expect(html).toContain('Size · 18px');
    expect(html.match(/<button[^>]*aria-pressed="true"[^>]*>(?:<span[^>]*>Aa<\/span>)Literata/)).not.toBeNull();
    for (const t of ['Font', 'Spacing', 'Width', 'Page', 'Reset to default', 'White', 'Sepia', 'Green', 'Dark']) expect(html).toContain(t);
    expect(button(html, 'Smaller')).not.toContain('disabled');
    expect(button(html, 'Larger')).not.toContain('disabled');
  });

  it('marks the ticks up to the current size', () => {
    const ticks = [...panel(17).matchAll(/<button[^>]*aria-label="(\d+)px"[^>]*>/g)].map(m => [m[1], /class="on"/.test(m[0])]);
    expect(ticks).toEqual([['15', true], ['16', true], ['17', true], ['18', false], ['20', false], ['22', false]]);
  });

  it('disables the ends at the limits', () => {
    expect(button(panel(15), 'Smaller')).toContain('disabled');
    expect(button(panel(22), 'Larger')).toContain('disabled');
  });

  it('closes on a mousedown outside the popover and the Aa button only', () => {
    const contains = (own: unknown) => (n: unknown) => n === own;
    const panelNode = { contains: contains('in-panel') } as unknown as Node;
    const buttonNode = { contains: contains('on-button') } as unknown as Node;
    expect(isOutside('elsewhere' as unknown as Node, panelNode, buttonNode)).toBe(true);
    expect(isOutside('in-panel' as unknown as Node, panelNode, buttonNode)).toBe(false);
    expect(isOutside('on-button' as unknown as Node, panelNode, buttonNode)).toBe(false);
  });
});

describe('sidebar toggles (contracts §4, §6)', () => {
  it('describes the state for screen readers', () => {
    const left = renderToStaticMarkup(<SidebarToggle side="left" open={false} onToggle={noop} />);
    expect(left).toContain('aria-pressed="false"');
    expect(left).toContain('aria-label="Show left sidebar"');
    expect(left).toContain('title="Queue &amp; features"');
    const right = renderToStaticMarkup(<SidebarToggle side="right" open onToggle={noop} />);
    expect(right).toContain('aria-pressed="true"');
    expect(right).toContain('aria-label="Hide right sidebar"');
    expect(right).toContain('title="Gate, highlights &amp; Copilot"');
  });

  it('does not render hidden sidebars at all (FR-008, SC-005)', () => {
    const html = renderToStaticMarkup(<App initialLayout={{ left: false, right: false }} />);
    expect(html).not.toContain('class="sk-side"');
    expect(html).not.toMatch(/class="sk-right/);
    expect(html).toContain('class="sk-body no-left no-right"');
    const both = renderToStaticMarkup(<App initialLayout={{ left: true, right: true }} />);
    expect(both).toContain('class="sk-side"');
    expect(both).toMatch(/class="sk-right/);
    expect(both).toContain('class="sk-body"');
  });
});

describe('shells (FR-012)', () => {
  it('demo: Aa and both toggles in the header, prose inside .sk-col', () => {
    const html = renderToStaticMarkup(<App />);
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)![0];
    expect(nav.indexOf('left sidebar')).toBeLessThan(nav.indexOf('nav-brand'));
    expect(nav).toContain('aria-label="Reading settings"');
    expect(nav.indexOf('Reading settings')).toBeLessThan(nav.indexOf('right sidebar'));
    expect(html).toMatch(/class="sk-doc"[^>]*><div class="sk-col">/);
  });

  it('local: the stage content sits in .sk-col', () => {
    const project = buildLocalProject('fixture', new Map([
      ['specs/001-a/spec.md', '# A\n\n## Requirements\n\n- **FR-001**: Something.']
    ]));
    const html = renderToStaticMarkup(<LocalStageContent feature={project.specs[0]} files={new Map([['specs/001-a/spec.md', 'Hello prose.']])} selected={1} />);
    expect(html).toMatch(/class="sk-doc"[^>]*><div class="sk-col">/);
  });
});
