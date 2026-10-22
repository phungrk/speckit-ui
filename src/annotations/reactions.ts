import { EMOJI } from '../../server/highlightsFile';
import type { Highlight, HighlightAuthor, Reaction } from '../project/types';
import { authorLabel, sameAuthor } from './brief';

// The emoji on a comment or a reply (specs/011 FR-006, FR-007): grouping, who reacted, and what a screen reader says.

/** The emoji that can be chosen, in the order they are shown and written. */
export const EMOJI_SET: readonly string[] = EMOJI;

export interface ReactionGroup {
  emoji: string;
  count: number;
  /** The current user reacted with this emoji. */
  mine: boolean;
  /** Who reacted, in the order they did. */
  names: string[];
}

/** One group per emoji that has at least one person, in the order of the set. */
export function groupReactions(list: Reaction[] | undefined, me: HighlightAuthor | null, name: (a: HighlightAuthor) => string = authorLabel): ReactionGroup[] {
  if (!list?.length) return [];
  return EMOJI_SET.flatMap(emoji => {
    const here = list.filter(r => r.emoji === emoji);
    return here.length ? [{ emoji, count: here.length, mine: here.some(r => sameAuthor(me, r.author)), names: here.map(r => name(r.author)) }] : [];
  });
}

/** What the button for a group says to a screen reader, and as its tooltip. */
export function reactionLabel(g: ReactionGroup): string {
  const who = g.names.join(', ');
  return `${g.emoji} ${g.count} ${g.count === 1 ? 'person' : 'people'}: ${who}${g.mine ? ' (including you)' : ''}`;
}

/** How many replies a comment has, for the closed card. */
export const replyCount = (h: Pick<Highlight, 'replies'>): number => h.replies?.length ?? 0;
