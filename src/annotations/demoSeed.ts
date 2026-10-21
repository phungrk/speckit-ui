import type { Highlight } from '../project/types';

// The four sample highlights of the design prototype (speckit/reader.jsx HL_SEED), on feature 003.
// Synthetic demo data, like src/data.ts.
const base = { doc: '', prefix: '', suffix: '', startHint: 0, docSha: null } as const;
const at = (iso: string) => ({ createdAt: iso, updatedAt: iso });
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const DEMO_SEED: Record<string, Highlight[]> = {
  '003': [
    { ...base, id: 'h1', phase: 'specify', quote: 'a stolen session cannot drain my account', color: 'y', note: '', author: { name: 'Director', demo: true }, ...at('2026-10-02T09:00:00.000Z') },
    { ...base, id: 'h2', phase: 'specify', quote: 'MUST require step-up authentication', color: 'b', note: 'What happens for users with no biometrics enrolled? Needs a fallback screen.', author: { name: 'Designer', demo: true }, ...at('2026-10-03T09:00:00.000Z') },
    { ...base, id: 'h3', phase: 'plan', quote: 'Limit check p95 < 50 ms', color: 'o', note: 'Where is this measured? Add it to quickstart.md.', author: { name: 'QA', demo: true }, ...at('2026-10-08T09:00:00.000Z') },
    { ...base, id: 'h4', phase: 'analyze', quote: 'It is unclear whether they count against the day they were scheduled or the day they execute.', color: 'p', note: 'Rent payments on the 1st will hit this. Must fix before Implement.', author: { name: 'QA', demo: true }, ...at(hoursAgo(3)) }
  ]
};
