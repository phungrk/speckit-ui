// The floating emoji button and its six emoji (specs/015-comment-hover, contracts/hover-ui.md), rendered statically.
// Opening, the keys and the placement are checked in the browser (quickstart 3, 6).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmojiButton, EmojiPicker } from '../src/annotations/EmojiButton';

const mai = { login: 'mai' }, lan = { login: 'lan' };
const noop = () => {};
const btn = (over: Partial<Parameters<typeof EmojiButton>[0]> = {}) => renderToStaticMarkup(<EmojiButton list={undefined} me={mai} readOnly={null} what="this comment" onToggle={noop} {...over} />);

describe('the floating button', () => {
  it('is one button named for what it is on, with a popup, closed at rest', () => {
    const html = btn({ what: 'the reply by lan' });
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
    expect(html).toContain('class="sk-cm-float-wrap"');
    expect(html).toContain('aria-label="Add a reaction to the reply by lan"');
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('sk-cm-picker');
  });

  it('draws a smiley with a plus as an SVG that a screen reader skips', () => {
    const html = btn();
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>/);
    expect(html).toContain('M19 2.5v5M16.5 5h5');
  });

  it('is off, with the reason, when saving is not possible', () => {
    const why = 'Your GitHub account has read-only access to o/a. Ask for write access to comment.';
    const html = btn({ readOnly: why });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(`title="${why}"`);
    expect(btn()).not.toContain('aria-disabled');
    expect(btn()).toContain('title="Add a reaction"');
  });
});

describe('the six emoji', () => {
  it('has the six emoji of the set, in order, each as a button with a label that says what it does', () => {
    const html = renderToStaticMarkup(<EmojiPicker mine={() => false} onPick={noop} />);
    expect(html).toContain('role="group" aria-label="Choose an emoji"');
    expect([...html.matchAll(/aria-label="React with (\S+)"/g)].map(m => m[1])).toEqual(['👍', '❤️', '😄', '🎉', '😕', '👀']);
    expect(html).not.toContain('Remove');
  });

  it('says Remove and marks it pressed for an emoji the user already put', () => {
    const html = renderToStaticMarkup(<EmojiPicker mine={e => e === '🎉'} onPick={noop} />);
    expect(html).toContain('aria-label="Remove 🎉"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>🎉</);
    expect([...html.matchAll(/aria-pressed="false"/g)]).toHaveLength(5);
  });

  it('is placed where it is told, fixed', () => {
    expect(renderToStaticMarkup(<EmojiPicker mine={() => false} onPick={noop} style={{ left: 40, top: 60, width: 212 }} />)).toContain('style="left:40px;top:60px;width:212px"');
  });

  it('does not know who reacted: that is the chips\' job', () => {
    expect(btn({ list: [{ emoji: '👍', author: lan }] })).not.toContain('👍');
  });
});
