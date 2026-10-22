// Grouping emoji by who put them (specs/011 FR-006, FR-007). Synthetic data only.
import { describe, expect, it } from 'vitest';
import { EMOJI_SET, groupReactions, reactionLabel, replyCount } from '../src/annotations/reactions';

const mai = { login: 'mai' }, lan = { login: 'lan' }, tom = { name: 'Tom', local: true as const };

describe('groupReactions', () => {
  it('gives nothing for no emoji', () => {
    expect(groupReactions(undefined, mai)).toEqual([]);
    expect(groupReactions([], mai)).toEqual([]);
  });

  it('counts per emoji, in the order of the set, and says who and whether it was the user', () => {
    const out = groupReactions([
      { emoji: '🎉', author: lan }, { emoji: '👍', author: lan }, { emoji: '👍', author: mai }, { emoji: '👍', author: tom }
    ], mai);
    expect(out.map(g => [g.emoji, g.count, g.mine])).toEqual([['👍', 3, true], ['🎉', 1, false]]);
    expect(out[0].names).toEqual(['lan', 'mai', 'Tom']);
  });

  it('does not treat a typed name as the same person as a login', () => {
    expect(groupReactions([{ emoji: '👍', author: { name: 'mai', local: true } }], mai)[0].mine).toBe(false);
    expect(groupReactions([{ emoji: '👍', author: mai }], null)[0].mine).toBe(false);
  });

  it('leaves out an emoji nobody put, and one outside the set', () => {
    const out = groupReactions([{ emoji: '🦄', author: lan }], mai);
    expect(out).toEqual([]);
    expect(EMOJI_SET).toHaveLength(6);
  });

  it('describes a group for a screen reader', () => {
    const [g] = groupReactions([{ emoji: '👍', author: lan }], mai);
    expect(reactionLabel(g)).toBe('👍 1 person: lan');
    const [h] = groupReactions([{ emoji: '👍', author: lan }, { emoji: '👍', author: mai }], mai);
    expect(reactionLabel(h)).toBe('👍 2 people: lan, mai (including you)');
  });
});

describe('replyCount', () => {
  it('counts replies, none when absent', () => {
    expect(replyCount({})).toBe(0);
    expect(replyCount({ replies: [{ id: 'r', author: mai, createdAt: 'x', text: 'a' }] })).toBe(1);
  });
});
