import type { HighlightColor } from '../project/types';

/** The four highlight colours with their fixed meaning, in toolbar order (contracts/annotations-ui.md). */
export const HL_COLORS: readonly { key: HighlightColor; meaning: string }[] = [
  { key: 'y', meaning: 'Key' },
  { key: 'p', meaning: 'Issue' },
  { key: 'b', meaning: 'Question' },
  { key: 'o', meaning: 'Change' }
];

/** A comment with no category (specs/012): not a toolbar swatch, it is what "Comment" creates. */
export const HL_NONE: { key: HighlightColor; meaning: string } = { key: 'n', meaning: 'Comment' };

export const meaningOf = (k: HighlightColor) => [...HL_COLORS, HL_NONE].find(c => c.key === k)?.meaning ?? 'Key';

/** The document a step shows, relative to the spec folder ('' for the constitution). */
export const PHASE_DOC: Record<string, string> = { constitution: '', specify: 'spec.md', clarify: 'spec.md', plan: 'plan.md', tasks: 'tasks.md', analyze: 'analysis.md', implement: 'tasks.md' };
