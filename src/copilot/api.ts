import type { CopilotMsg } from './Copilot';

export interface Turn { role: 'user' | 'assistant'; content: string }

const MAX_TURNS = 8;

/** Thread → API turns: drop error replies, merge same-role neighbours, keep the last turns starting with a user turn. */
export function toTurns(hist: CopilotMsg[]): Turn[] {
  const turns: Turn[] = [];
  for (const m of hist) {
    if (m.err) continue;
    const role = m.r === 'user' ? 'user' : 'assistant';
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += '\n\n' + m.t;
    else turns.push({ role, content: m.t });
  }
  let out = turns.slice(-MAX_TURNS);
  if (out[0]?.role === 'assistant') out = out.slice(1);
  return out;
}

export class OfflineError extends Error {}

/** Calls the Copilot proxy. Throws OfflineError when the server has no API key. */
export async function requestCopilot(context: string, hist: CopilotMsg[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, messages: toTurns(hist) })
    });
  } catch {
    throw new Error('Copilot could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({})) as { text?: string; offline?: boolean; message?: string };
  if (data.offline) throw new OfflineError();
  if (!res.ok || typeof data.text !== 'string') throw new Error(data.message || 'Copilot could not reach the model. Try again in a moment.');
  return data.text;
}
