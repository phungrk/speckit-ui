// Text-quote anchoring (specs/010-spec-annotations research R5). Synthetic text only.
import { describe, expect, it } from 'vitest';
import { CONTEXT, anchorAt, contentHash, locate, selectionOk } from '../src/annotations/anchor';

const at = (text: string, quote: string, nth = 0) => {
  let i = -1;
  for (let k = 0; k <= nth; k++) i = text.indexOf(quote, i + 1);
  return anchorAt(text, i, i + quote.length)!;
};

describe('anchorAt', () => {
  it('trims surrounding whitespace and keeps up to 32 chars of context', () => {
    const text = 'x'.repeat(50) + '  the quoted part  ' + 'y'.repeat(50);
    const a = anchorAt(text, 50, 50 + '  the quoted part  '.length)!;
    expect(a.quote).toBe('the quoted part');
    expect(a.startHint).toBe(52);
    expect(a.prefix).toHaveLength(CONTEXT);
    expect(a.prefix.endsWith('x  ')).toBe(true);
    expect(a.suffix).toHaveLength(CONTEXT);
  });

  it('rejects empty, one-character and whitespace-only selections', () => {
    expect(anchorAt('a b c', 0, 1)).toBeNull();
    expect(anchorAt('a    b', 1, 5)).toBeNull();
    expect(selectionOk(' x ')).toBe(false);
    expect(selectionOk('ab')).toBe(true);
  });
});

describe('locate', () => {
  const text = 'Users pay rent on the first. Then the cap applies daily. Later: the cap applies daily, except weekends.';

  it('finds the right occurrence of a repeated quote', () => {
    const second = at(text, 'the cap applies daily', 1);
    const r = locate(text, second)!;
    expect(r.start).toBe(text.lastIndexOf('the cap applies daily'));
    const first = at(text, 'the cap applies daily', 0);
    expect(locate(text, first)!.start).toBe(text.indexOf('the cap applies daily'));
  });

  it('uses the start hint to break ties when the context is equal', () => {
    const t = 'ab XX cd ab XX cd';
    expect(locate(t, { quote: 'XX', prefix: 'ab ', suffix: ' cd', startHint: 12 })!.start).toBe(12);
    expect(locate(t, { quote: 'XX', prefix: 'ab ', suffix: ' cd', startHint: 3 })!.start).toBe(3);
  });

  it('still anchors after unrelated text is inserted before it', () => {
    const a = at(text, 'except weekends');
    const changed = 'A new opening paragraph. ' + text;
    expect(changed.slice(locate(changed, a)!.start).startsWith('except weekends')).toBe(true);
  });

  it('returns null when the quote is gone, and finds it again when restored (US4)', () => {
    const a = at(text, 'pay rent on the first');
    const edited = text.replace('pay rent on the first', 'pay rent at month start');
    expect(locate(edited, a)).toBeNull();
    expect(locate(text, a)!.start).toBe(text.indexOf('pay rent on the first'));
  });
});

describe('contentHash', () => {
  it('is stable, short and changes with the text', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'));
    expect(contentHash('abc')).toMatch(/^h:[0-9a-f]{8}$/);
    expect(contentHash('abc')).not.toBe(contentHash('abd'));
  });
});

describe('Outdated across versions (US4)', () => {
  const a = 'Limits\nThe cap applies daily per account.\nReports show the cap applies daily per account too.\n';
  const b = 'Limits\nThe limit resets every week for each account.\nReports show the weekly limit too.\n';
  const c = 'Intro added above.\n' + a;

  it('returns null on version B, where the sentence was edited', () => {
    expect(locate(b, at(a, 'cap applies daily per account', 0))).toBeNull();
    expect(locate(b, at(a, 'cap applies daily per account', 1))).toBeNull();
  });

  it('finds each highlight again at its own occurrence when version C restores the text', () => {
    for (const nth of [0, 1]) {
      const h = at(a, 'cap applies daily per account', nth);
      const found = locate(c, h)!;
      let want = -1;
      for (let k = 0; k <= nth; k++) want = c.indexOf('cap applies daily per account', want + 1);
      expect(found.start).toBe(want);
    }
  });
});
