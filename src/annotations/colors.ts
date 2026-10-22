import type { HighlightColor } from '../project/types';

/**
 * The colours a highlight can have, for painting its text: y Key, p Issue, b Question, o Change (specs/010) and n, a comment
 * with no category (specs/012). Nothing in the interface chooses among them any more: every new comment is Change `o`
 * (specs/014), and the others are what older files hold and keep.
 */
export const HL_KEYS: readonly HighlightColor[] = ['y', 'p', 'b', 'o', 'n'];

/** The document a step shows, relative to the spec folder ('' for the constitution). */
export const PHASE_DOC: Record<string, string> = { constitution: '', specify: 'spec.md', clarify: 'spec.md', plan: 'plan.md', tasks: 'tasks.md', analyze: 'analysis.md', implement: 'tasks.md' };
