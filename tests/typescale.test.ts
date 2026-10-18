// The type scale (specs/006): every font size goes through var(--fs-N), and the phone values
// live in one @media block. These checks read the sources as text, so they run without a browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const STYLES = ['modernist.css', 'workspace.css', 'live.css'].map(f => join('src/styles', f));
const css = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The phone values from specs/006-mobile-font-size/data-model.md. */
const PHONE: Record<number, number> = {
  10: 12, 11: 12, 12: 12, 13: 14, 14: 16, 15: 16, 16: 17, 17: 18, 18: 18, 20: 20, 24: 22, 25: 22, 28: 26, 32: 26, 42: 30
};

const PHONE_BLOCK = /@media\s*\(max-width:\s*760px\)\s*\{\s*:root\s*\{([^}]*)\}([^@]*?)\n\}/;
/** The one literal size that is allowed: iOS zooms into any field below 16px (research R5). */
const INPUT_RULE = /input\s*,\s*select\s*,\s*textarea\s*\{\s*font-size:\s*16px\s*!important;?\s*\}/g;

const modernist = css('src/styles/modernist.css');
const phone = modernist.match(PHONE_BLOCK);
const vars = (text: string) => Object.fromEntries([...text.matchAll(/--fs-(\d+):\s*(\d+)px/g)].map(m => [Number(m[1]), Number(m[2])]));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('type scale', () => {
  it('has one phone block in modernist.css', () => {
    expect(phone).not.toBeNull();
  });

  it('declares the 15 variables on :root, each equal to its own px size (desktop is unchanged, SC-002)', () => {
    const desktop = vars(modernist.replace(PHONE_BLOCK, ''));
    expect(Object.keys(desktop).map(Number).sort((a, b) => a - b)).toEqual(Object.keys(PHONE).map(Number).sort((a, b) => a - b));
    for (const [n, px] of Object.entries(desktop)) expect(px, `--fs-${n}`).toBe(Number(n));
  });

  it('sets the phone values from the table, never below 12px (FR-001, FR-003)', () => {
    const p = vars(phone![1]);
    expect(p).toEqual(PHONE);
    for (const px of Object.values(p)) expect(px).toBeGreaterThanOrEqual(12);
  });

  it('keeps content text at 16px and never inverts the order of two sizes (FR-002)', () => {
    const p = vars(phone![1]);
    expect(p[14]).toBe(16);
    expect(p[15]).toBe(16);
    const sizes = Object.keys(p).map(Number).sort((a, b) => a - b);
    sizes.slice(1).forEach((n, i) => expect(p[n], `--fs-${n} vs --fs-${sizes[i]}`).toBeGreaterThanOrEqual(p[sizes[i]]));
  });

  it('forces 16px on inputs, selects and textareas on phones, with exactly one such rule (FR-004)', () => {
    expect(phone![2].match(INPUT_RULE)).toHaveLength(1);
    for (const f of STYLES) if (!f.endsWith('modernist.css')) expect(css(f).match(INPUT_RULE) ?? []).toHaveLength(0);
  });

  it.each(STYLES)('%s has no font size written as a number (FR-008)', f => {
    const text = css(f).replace(INPUT_RULE, '');
    const bad = [...text.matchAll(/font-size\s*:\s*([^;}]+)/g)].map(m => m[1].trim()).filter(v => !/^var\(--fs-\d+\)$/.test(v));
    expect(bad).toEqual([]);
  });

  it('uses only variables that are declared', () => {
    const declared = new Set(Object.keys(PHONE));
    const used = new Set(STYLES.flatMap(f => [...css(f).matchAll(/var\(--fs-(\d+)\)/g)].map(m => m[1])));
    expect([...used].filter(n => !declared.has(n))).toEqual([]);
  });

  it('has no font size written as a number in TSX', () => {
    const bad = sources('src').flatMap(f => [...readFileSync(f, 'utf8').matchAll(/fontSize\s*:\s*([^,}\n]+)/g)]
      .map(m => `${f}: ${m[1].trim()}`).filter(s => !/: 'var\(--fs-\d+\)'$/.test(s)));
    expect(bad).toEqual([]);
  });
});
