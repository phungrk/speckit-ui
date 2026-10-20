// Reader settings (specs/010): the values, their defaults, and how they reach the page.
// Display preferences only, never project state (constitution I). The page themes are the one
// colour exception in constitution IV: declared here once and applied by overriding tokens.

export type FontKey = 'literata' | 'source' | 'atkinson' | 'archivo';
export type ThemeKey = 'white' | 'sepia' | 'green' | 'dark';

export interface ReaderSettings {
  font: FontKey;
  /** px */
  size: number;
  lh: number;
  /** px, the max width of the reading column */
  width: number;
  theme: ThemeKey;
}

export interface LayoutPrefs {
  left: boolean;
  right: boolean;
}

export const FONTS: readonly { key: FontKey; name: string; css: string }[] = [
  { key: 'literata', name: 'Literata', css: '"Literata", Georgia, serif' },
  { key: 'source', name: 'Source Serif', css: '"Source Serif 4", Georgia, serif' },
  { key: 'atkinson', name: 'Atkinson', css: '"Atkinson Hyperlegible", system-ui, sans-serif' },
  { key: 'archivo', name: 'Archivo', css: '"Archivo", system-ui, sans-serif' }
];
export const SIZES: readonly number[] = [15, 16, 17, 18, 20, 22];
export const LINE_HEIGHTS: readonly number[] = [1.5, 1.7, 1.9];
export const WIDTHS: readonly { key: string; px: number }[] = [{ key: 'narrow', px: 600 }, { key: 'medium', px: 700 }, { key: 'wide', px: 820 }];

export interface Theme { key: ThemeKey; name: string; bg: string; surface: string; text: string; divider: string }
export const THEMES: readonly Theme[] = [
  { key: 'white', name: 'White', bg: '#FFFFFF', surface: '#F3F3F1', text: '#1A1A1A', divider: 'rgba(26,26,26,.18)' },
  { key: 'sepia', name: 'Sepia', bg: '#F6EEDC', surface: '#EDE2CA', text: '#5B4636', divider: 'rgba(91,70,54,.22)' },
  { key: 'green', name: 'Green', bg: '#D6E9D5', surface: '#C7DEC6', text: '#22301F', divider: 'rgba(34,48,31,.20)' },
  { key: 'dark', name: 'Dark', bg: '#121212', surface: '#1E1E1E', text: '#D8D2C6', divider: 'rgba(216,210,198,.18)' }
];
/** Dark also retunes the tinted accents so callouts stay legible, and swaps shadows for a hairline edge. */
export const DARK_OVERRIDES: Readonly<Record<string, string>> = {
  '--color-accent-100': '#3b1e19',
  '--color-accent-200': '#55241b',
  '--color-accent-700': '#ff9a86',
  '--color-accent-800': '#ffc0b3',
  '--color-neutral-300': '#333',
  '--shadow-sm': '0 0 0 1px var(--color-divider)',
  '--shadow-md': '0 0 0 1px var(--color-divider)',
  '--shadow-lg': '0 0 0 1px var(--color-divider)'
};

export const DEFAULT_READER: ReaderSettings = { font: 'literata', size: 18, lh: 1.7, width: 700, theme: 'white' };
export const DEFAULT_LAYOUT: LayoutPrefs = { left: true, right: true };

const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const oneOf = <T,>(v: unknown, allowed: readonly T[], d: T): T => allowed.includes(v as T) ? v as T : d;

/** Keeps every valid field and replaces each invalid or missing one with its default. */
export function parseReader(v: unknown): ReaderSettings {
  const o = obj(v);
  return {
    font: oneOf(o.font, FONTS.map(f => f.key), DEFAULT_READER.font),
    size: oneOf(o.size, SIZES, DEFAULT_READER.size),
    lh: oneOf(o.lh, LINE_HEIGHTS, DEFAULT_READER.lh),
    width: oneOf(o.width, WIDTHS.map(w => w.px), DEFAULT_READER.width),
    theme: oneOf(o.theme, THEMES.map(t => t.key), DEFAULT_READER.theme)
  };
}

export function parseLayout(v: unknown): LayoutPrefs {
  const o = obj(v);
  return { left: typeof o.left === 'boolean' ? o.left : true, right: typeof o.right === 'boolean' ? o.right : true };
}

export const themeOf = (k: ThemeKey): Theme => THEMES.find(t => t.key === k) ?? THEMES[0];

/** The CSS variables for one set of settings, as written on :root. */
export function readerVars(s: ReaderSettings): Record<string, string> {
  const t = themeOf(s.theme);
  return {
    '--rd-font': (FONTS.find(f => f.key === s.font) ?? FONTS[0]).css,
    '--rd-size': `${s.size}px`,
    '--rd-size-sm': `${s.size - 2}px`,
    '--rd-size-xs': `${s.size - 3}px`,
    '--rd-lh': String(s.lh),
    '--rd-measure': `${s.width}px`,
    '--color-bg': t.bg,
    '--color-surface': t.surface,
    '--color-text': t.text,
    '--color-divider': t.divider,
    ...(t.key === 'dark' ? DARK_OVERRIDES : {})
  };
}

/** Writes the settings on the document root, so dialogs and pages outside the shell follow too (research R1). */
export function applyReader(s: ReaderSettings, root: HTMLElement = document.documentElement): void {
  const vars = readerVars(s);
  for (const k of Object.keys(DARK_OVERRIDES)) if (!(k in vars)) root.style.removeProperty(k);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.readerTheme = s.theme;
}

/** The last settings used on this device, read before the first render (research R2). */
export const DEVICE_KEY = 'sk.reader';

const device = (): Storage | null => { try { return localStorage; } catch { return null; } };

export function loadDeviceReader(store: Storage | null = device()): ReaderSettings | null {
  try { const v = store?.getItem(DEVICE_KEY); return v ? parseReader(JSON.parse(v)) : null; } catch { return null; }
}

/** The applied variables, for public/reader-boot.js to copy before the first paint. */
export const DEVICE_VARS_KEY = 'sk.reader.vars';

export function saveDeviceReader(s: ReaderSettings, store: Storage | null = device()): void {
  try {
    store?.setItem(DEVICE_KEY, JSON.stringify(s));
    store?.setItem(DEVICE_VARS_KEY, JSON.stringify({ theme: s.theme, vars: readerVars(s) }));
  } catch { /* preferences are best effort */ }
}

/** Data-model "Luồng" step 2: the owner's settings win; without them the device settings become the owner's. */
export function resolveReader(deviceValue: ReaderSettings | null, ownerValue: ReaderSettings | null): { settings: ReaderSettings; saveOwner: boolean } {
  if (ownerValue) return { settings: ownerValue, saveOwner: false };
  return { settings: deviceValue ?? DEFAULT_READER, saveOwner: true };
}

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
