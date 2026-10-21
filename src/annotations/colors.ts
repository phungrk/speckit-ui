import type { HighlightColor } from '../project/types';

/** The four highlight colours with their fixed meaning, in toolbar order (contracts/annotations-ui.md). */
export const HL_COLORS: readonly { key: HighlightColor; meaning: string }[] = [
  { key: 'y', meaning: 'Key' },
  { key: 'p', meaning: 'Issue' },
  { key: 'b', meaning: 'Question' },
  { key: 'o', meaning: 'Change' }
];

export const meaningOf = (k: HighlightColor) => HL_COLORS.find(c => c.key === k)?.meaning ?? 'Key';
