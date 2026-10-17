import { describe, expect, it } from 'vitest';
import { SK, T018 } from '../src/data';
import { buildContext, gateBrief, refPhase, type WorkspaceState } from '../src/copilot/context';
import { toTurns } from '../src/copilot/api';
import { offlineAnswer } from '../src/copilot/offline';
import { validate } from '../server/copilot';

const f003 = SK.features.find(f => f.id === '003')!;
const state = (over: Partial<WorkspaceState> = {}): WorkspaceState => ({
  f: f003, phase: SK.phases[5], role: 'QA', resolved: {}, done: { T001: true }, qa: {}, tasks: SK.tasks, features: SK.features, ...over
});

describe('gateBrief', () => {
  it('flags the open HIGH finding and the early approval at Analyze', () => {
    const b = gateBrief(state())!;
    expect(b[0]).toBe('A1 is HIGH and open: scheduled transfers may bypass the daily cap.');
    expect(b[1]).toBe('Engineer approved before A1 was resolved. Confirm they agree with the fix.');
    expect(b[2]).toBe('3 findings open. A2 and A3 do not block this gate.');
  });
  it('treats a finding resolved with option 0 as resolved', () => {
    expect(gateBrief(state({ resolved: { A1: 0, A2: 0, A3: 0 } }))![0]).toBe('All findings resolved. Coverage is 6 of 6 requirements.');
  });
  it('labels failing scenarios the way the UI does', () => {
    const b = gateBrief(state({ phase: SK.phases[6], qa: { 'US1-0': 'Pass', 'US2-1': 'Fail' } }))!;
    expect(b[1]).toBe('1 of 5 acceptance scenarios passed.');
    expect(b[2]).toBe('Failing: US2.2. Ship stays blocked.');
  });
  it('summarises a draft spec at Specify', () => {
    const draft = { ...SK.features[3], draft: { desc: '', stories: [], frs: [['FR-001', 'x'], ['FR-002', 'y', '[NEEDS CLARIFICATION]']], sc: [], checklist: [['a', true], ['b', false]] } } as WorkspaceState['f'];
    expect(gateBrief(state({ f: draft, phase: SK.phases[1] }))![0]).toBe('1 requirements still marked [NEEDS CLARIFICATION]: FR-002.');
  });
});

describe('refPhase', () => {
  it('maps artifact IDs to the phase that holds them', () => {
    expect(['FR-002', 'SC-001', 'US2', 'Q1', 'A1'].map(r => refPhase(r, false))).toEqual([1, 1, 1, 2, 5]);
    expect(refPhase('T009', false)).toBe(4);
    expect(refPhase('T009', true)).toBe(6);
  });
});

describe('buildContext', () => {
  it('includes FR-006 and T018 once A1 is fixed', () => {
    const ctx = buildContext(state({ resolved: { A1: 0 }, tasks: [...SK.tasks, T018] }));
    expect(ctx).toContain('FR-006 Scheduled transfers');
    expect(ctx).toContain('T018');
    expect(ctx).toContain('A1 HIGH Coverage gap');
    expect(ctx).toContain('resolved with "Add FR-006');
  });
});

describe('toTurns', () => {
  it('drops error replies and merges same-role neighbours', () => {
    expect(toTurns([
      { r: 'user', t: 'a' }, { r: 'ai', t: 'oops', err: true }, { r: 'user', t: 'b' }
    ])).toEqual([{ role: 'user', content: 'a\n\nb' }]);
  });
  it('keeps at most 8 turns and starts with a user turn', () => {
    const hist = Array.from({ length: 11 }, (_, i) => ({ r: i % 2 ? 'ai' as const : 'user' as const, t: String(i) }));
    const turns = toTurns(hist);
    expect(turns.length).toBeLessThanOrEqual(8);
    expect(turns[0].role).toBe('user');
    expect(turns.at(-1)!.content).toBe('10');
  });
});

describe('server validate', () => {
  it('accepts a well-formed request', () => {
    expect(validate({ context: 'x', messages: [{ role: 'user', content: 'hi' }] })).toBeNull();
  });
  it('rejects bad shapes', () => {
    expect(validate(null)).toMatch(/JSON object/);
    expect(validate({ context: 'x', messages: [] })).toMatch(/1–8/);
    expect(validate({ context: 'x', messages: [{ role: 'system', content: 'hi' }] })).toMatch(/invalid/);
    expect(validate({ context: 'x', messages: [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }] })).toMatch(/alternate/);
    expect(validate({ context: 'x', messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).toMatch(/end with a user/);
  });
});

describe('offlineAnswer', () => {
  it('answers every suggested question with something specific', () => {
    const qs = ['Summarize where this feature stands in 3 lines', 'What is blocking release, and who owns it?', 'Which open tasks can run in parallel right now?', 'Which acceptance scenarios have no test task?', 'Is the open HIGH finding safe to defer?', 'Check accessibility coverage against principle II'];
    for (const q of qs) expect(offlineAnswer(q, state())).not.toMatch(/only answers the suggested questions/);
  });
  it('finds the story with no QA test', () => {
    expect(offlineAnswer('Which acceptance scenarios have no test task?', state())).toContain('US3');
  });
});
