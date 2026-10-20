// Reader settings (specs/010): model, CSS variables, owner/device flow, contrast, shortcuts and
// static checks on the stylesheets. Runs without a browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  DARK_OVERRIDES, DEFAULT_READER, DEVICE_KEY, DEVICE_VARS_KEY, THEMES, contrast, loadDeviceReader, parseLayout, parseReader,
  readerVars, resolveReader, saveDeviceReader
} from '../src/reader/settings';
import { sidebarKey } from '../src/reader/ReaderControls';

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const mem = () => new MemoryStorage() as unknown as Storage;
const css = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('reader settings model', () => {
  it('has the defaults from data-model.md', () => {
    expect(DEFAULT_READER).toEqual({ font: 'literata', size: 18, lh: 1.7, width: 700, theme: 'white' });
  });

  it('keeps valid fields and replaces each invalid or missing one with its default', () => {
    expect(parseReader({ size: 19, theme: 'blue', font: 'archivo' })).toEqual({ ...DEFAULT_READER, font: 'archivo' });
    expect(parseReader({ size: 22, lh: 1.9, width: 820, theme: 'dark', font: 'source' })).toEqual({ font: 'source', size: 22, lh: 1.9, width: 820, theme: 'dark' });
    for (const bad of [null, 'x', 3, [], undefined]) expect(parseReader(bad)).toEqual(DEFAULT_READER);
  });

  it('parses the sidebar layout with both shown by default', () => {
    expect(parseLayout(null)).toEqual({ left: true, right: true });
    expect(parseLayout({ left: false, right: 'no' })).toEqual({ left: false, right: true });
  });

  it('turns settings into exactly the CSS variables of contracts §1–2', () => {
    const v = readerVars({ font: 'atkinson', size: 20, lh: 1.5, width: 600, theme: 'sepia' });
    expect(v).toEqual({
      '--rd-font': '"Atkinson Hyperlegible", system-ui, sans-serif',
      '--rd-size': '20px', '--rd-size-sm': '18px', '--rd-size-xs': '17px', '--rd-lh': '1.5', '--rd-measure': '600px',
      '--color-bg': '#F6EEDC', '--color-surface': '#EDE2CA', '--color-text': '#5B4636', '--color-divider': 'rgba(91,70,54,.22)'
    });
  });

  it('adds the Dark overrides only for Dark', () => {
    const dark = readerVars({ ...DEFAULT_READER, theme: 'dark' });
    for (const [k, val] of Object.entries(DARK_OVERRIDES)) expect(dark[k]).toBe(val);
    expect(dark['--color-accent-700']).toBe('#ff9a86');
    expect(readerVars(DEFAULT_READER)['--color-accent-700']).toBeUndefined();
  });
});

describe('device and owner settings', () => {
  it('round-trips the device copy and tolerates broken or blocked storage', () => {
    const s = mem();
    expect(loadDeviceReader(s)).toBeNull();
    saveDeviceReader({ ...DEFAULT_READER, theme: 'green' }, s);
    expect(loadDeviceReader(s)).toEqual({ ...DEFAULT_READER, theme: 'green' });
    s.setItem(DEVICE_KEY, '{oops');
    expect(loadDeviceReader(s)).toBeNull();
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } as unknown as Storage;
    expect(loadDeviceReader(blocked)).toBeNull();
    expect(() => saveDeviceReader(DEFAULT_READER, blocked)).not.toThrow();
  });

  it('lets the owner value win and copies the device value on the first visit', () => {
    const device = { ...DEFAULT_READER, theme: 'dark' as const };
    const owner = { ...DEFAULT_READER, size: 22 };
    expect(resolveReader(device, owner)).toEqual({ settings: owner, saveOwner: false });
    expect(resolveReader(device, null)).toEqual({ settings: device, saveOwner: true });
    expect(resolveReader(null, null)).toEqual({ settings: DEFAULT_READER, saveOwner: true });
  });
});

describe('first-paint boot script (public/reader-boot.js, research R2)', () => {
  const boot = readFileSync('public/reader-boot.js', 'utf8');
  const run = (stored: string | null) => {
    const props: Record<string, string> = {};
    const attrs: Record<string, string> = {};
    const documentElement = { style: { setProperty: (k: string, v: string) => { props[k] = v; } }, setAttribute: (k: string, v: string) => { attrs[k] = v; } };
    runInNewContext(boot, { localStorage: { getItem: () => stored }, document: { documentElement } });
    return { props, attrs };
  };

  it('copies the variables that saveDeviceReader stored', () => {
    const s = mem();
    saveDeviceReader({ ...DEFAULT_READER, theme: 'dark', size: 20 }, s);
    const { props, attrs } = run(s.getItem(DEVICE_VARS_KEY));
    expect(attrs['data-reader-theme']).toBe('dark');
    expect(props).toEqual(readerVars({ ...DEFAULT_READER, theme: 'dark', size: 20 }));
  });

  it('ignores missing, broken or unexpected values', () => {
    expect(run(null)).toEqual({ props: {}, attrs: {} });
    expect(run('{oops')).toEqual({ props: {}, attrs: {} });
    expect(run(JSON.stringify({ theme: 'neon', vars: { '--color-bg': 'red' } }))).toEqual({ props: {}, attrs: {} });
    const { props } = run(JSON.stringify({ theme: 'white', vars: { '--color-bg': '#fff', 'color': 'red', '--x; y': 'z', '--rd-size': 3 } }));
    expect(props).toEqual({ '--color-bg': '#fff' });
  });

  it('is loaded as a classic script in <head> before the bundle', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<head>[\s\S]*<script src="%BASE_URL%reader-boot\.js"><\/script>[\s\S]*<\/head>/);
  });
});

describe('page themes (constitution IV 1.2.0, FR-006)', () => {
  it.each(THEMES.map(t => [t.key, t] as const))('%s: body text is at least 4.5:1 on background and surface', (_k, t) => {
    expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps accent-700 legible on every theme', () => {
    const dark = THEMES.find(t => t.key === 'dark')!;
    expect(contrast(DARK_OVERRIDES['--color-accent-700'], dark.bg)).toBeGreaterThanOrEqual(4.5);
    const accent700 = css('src/styles/modernist.css').match(/--color-accent-700:\s*(#[0-9a-f]{6})/i)![1];
    for (const t of THEMES.filter(x => x.key !== 'dark')) expect(contrast(accent700, t.bg), t.key).toBeGreaterThanOrEqual(4.5);
  });
});

function sources(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p, ext) : ext.test(n) ? [p] : [];
  });
}

describe('no hard-coded colours (research R8)', () => {
  const HEX = /#(?:fff|ffffff|000|000000)\b/i;
  const KEYWORD = /:\s*[^;{}]*\b(?:white|black)\b/i;

  /** Constitution IV 1.3.0: the highlight colours live in one :root block of reader.css, as --hl-* tokens. */
  const HL_TOKENS = /:root\s*\{[^}]*--hl-[^}]*\}/;

  it.each(['src/styles/workspace.css', 'src/styles/live.css', 'src/styles/reader.css'])('%s', f => {
    const text = css(f).replace(HL_TOKENS, '');
    expect(text.match(HEX)?.[0] ?? null).toBeNull();
    expect(text.match(KEYWORD)?.[0] ?? null).toBeNull();
  });

  it('declares the highlight colours once, as --hl-* tokens, and uses them only through var()', () => {
    const r = css('src/styles/reader.css');
    const blocks = r.match(new RegExp(HL_TOKENS.source, 'g')) ?? [];
    expect(blocks).toHaveLength(1);
    const rest = r.replace(HL_TOKENS, '');
    expect(rest.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });

  it('modernist.css only has them inside :root token definitions', () => {
    const outside = css('src/styles/modernist.css').replace(/:root\s*\{[^}]*\}/g, '');
    expect(outside.match(HEX)?.[0] ?? null).toBeNull();
    expect(outside.match(KEYWORD)?.[0] ?? null).toBeNull();
  });

  it('TSX has none (theme swatches take their colours from THEMES)', () => {
    const bad = sources('src', /\.tsx$/).filter(f => HEX.test(readFileSync(f, 'utf8')) || /['"](?:white|black)['"]/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });

  it('src/reader never reaches the network or writes anywhere (FR-013)', () => {
    const bad = sources('src/reader', /\.tsx?$/).filter(f => /\bfetch\(|from '\.\.\/backend'|trackingApi|repoLoader|from '\.\.\/\.\.\/server/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});

describe('reading column (contracts §3)', () => {
  const r = css('src/styles/reader.css');
  const rule = (sel: string) => r.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{]*\\{([^}]*)\\}'))?.[1] ?? '';

  it('sets the reading font, size and line height on prose', () => {
    const prose = rule('.sk-col p');
    expect(prose).toContain('var(--rd-font)');
    expect(prose).toContain('var(--rd-size)');
    expect(prose).toContain('var(--rd-lh)');
    expect(rule('.sk-col td')).toContain('var(--rd-size-sm)');
    expect(rule('.sk-col .sk-opt')).toContain('var(--rd-size-xs)');
  });

  it('keeps headings, IDs, paths, buttons and code in the UI font', () => {
    const ui = r.match(/\.sk-col :is\(([^)]*)\)\s*\{([^}]*)\}/);
    expect(ui).not.toBeNull();
    for (const s of ['h1', 'h6', '.sk-id', '.sk-path', '.sk-owner', '.sk-meta', '.sk-file', '.tag', 'button', '.btn', '.sk-pass', '.sk-nc', 'code', 'pre', 'th']) expect(ui![1]).toContain(s);
    expect(ui![2]).toContain('font-family: var(--font-body)');
  });
});

describe('sidebar shortcuts (research R7)', () => {
  const ev = (key: string, tag = 'DIV', mods: Partial<KeyboardEvent> = {}) =>
    ({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods, target: { tagName: tag, isContentEditable: false } }) as unknown as KeyboardEvent;

  it('maps [ and ] to the left and right sidebars', () => {
    expect(sidebarKey(ev('['))).toBe('left');
    expect(sidebarKey(ev(']'))).toBe('right');
    expect(sidebarKey(ev('a'))).toBeNull();
  });

  it('ignores typing in fields and modified keys', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) expect(sidebarKey(ev('[', tag))).toBeNull();
    expect(sidebarKey({ ...ev('['), target: { tagName: 'DIV', isContentEditable: true } } as unknown as KeyboardEvent)).toBeNull();
    for (const m of ['ctrlKey', 'metaKey', 'altKey']) expect(sidebarKey(ev('[', 'DIV', { [m]: true }))).toBeNull();
  });
});
