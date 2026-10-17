import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.COPILOT_MODEL || 'claude-opus-5-5';
const MAX_CONTEXT = 150_000;
const MAX_MESSAGE = 4_000;
const MAX_TURNS = 8;
const RATE_LIMIT = 15; // requests per minute per client

export const SYSTEM_PROMPT = `You are Copilot inside a Spec Kit (spec-driven development) workspace used by a cross-functional team.
Answer only from the project context provided. If something is not in the context, say so plainly.
Tailor the answer to the user's role and answer in the language the user writes in. Be brief: at most 6 short lines or bullets, no preamble, no headings.
Always cite artifact IDs exactly as written (FR-001, SC-001, US1, T009, A1, Q2) so the user can jump to them.
Use "- " for bullets and **bold** sparingly. Never claim you changed files; you only suggest.`;

export interface CopilotTurn { role: 'user' | 'assistant'; content: string }
export interface CopilotRequest { context: string; messages: CopilotTurn[] }

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const hits = new Map<string, number[]>();
function rateLimited(key: string, now = Date.now()) {
  const recent = (hits.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT;
}

/** Returns an error message, or null when the body is a usable request. */
export function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object.';
  const { context, messages } = body as Partial<CopilotRequest>;
  if (typeof context !== 'string' || context.length > MAX_CONTEXT) return 'context must be a string under 150,000 characters.';
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) return `messages must hold 1–${MAX_TURNS} turns.`;
  for (const [i, m] of messages.entries()) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_MESSAGE) return `messages[${i}] is invalid.`;
    if (i > 0 && messages[i - 1].role === m.role) return 'messages must alternate between user and assistant.';
  }
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') return 'messages must start and end with a user turn.';
  return null;
}

const send = (res: ServerResponse, status: number, data: object) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

async function readJson(req: IncomingMessage): Promise<unknown> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_CONTEXT + MAX_TURNS * MAX_MESSAGE + 4096) throw new Error('too large');
  }
  return JSON.parse(raw);
}

export async function handleCopilot(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  // Without credentials the client switches to its offline responder.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return send(res, 200, { offline: true });
  if (rateLimited(req.socket.remoteAddress || 'local')) return send(res, 429, { error: 'rate_limited', message: 'Copilot allows 15 questions a minute. Try again shortly.' });

  let body: unknown;
  try { body = await readJson(req); } catch { return send(res, 400, { error: 'bad_request', message: 'Body must be JSON.' }); }
  const invalid = validate(body);
  if (invalid) return send(res, 400, { error: 'bad_request', message: invalid });
  const { context, messages } = body as CopilotRequest;

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      // Re-run a safety decline on Anthropic's recommended fallback model instead of failing the turn.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: `${SYSTEM_PROMPT}\n\nPROJECT CONTEXT\n${context}`,
      messages
    });
    if (response.stop_reason === 'refusal') return send(res, 200, { text: 'Copilot can’t help with that request. Try rephrasing it around this feature’s artifacts.' });
    const text = response.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
    return send(res, 200, { text: text || 'Copilot returned an empty answer. Try again.', model: response.model });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'rate_limited', message: 'The model is busy. Try again in a moment.' });
    if (error instanceof Anthropic.AuthenticationError) return send(res, 200, { offline: true });
    if (error instanceof Anthropic.APIError) {
      console.error(`Copilot API error ${error.status}:`, error.message);
      return send(res, 502, { error: 'upstream', message: 'Copilot could not reach the model. Try again in a moment.' });
    }
    console.error('Copilot error:', error);
    return send(res, 500, { error: 'internal', message: 'Copilot hit an unexpected error.' });
  }
}
