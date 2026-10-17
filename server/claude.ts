// The Copilot call to Claude. No Node APIs, so the server and the static (browser) build share it.
import type Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export const SYSTEM_PROMPT = `You are Copilot inside a Spec Kit (spec-driven development) workspace used by a cross-functional team.
Answer only from the project context provided. If something is not in the context, say so plainly.
Tailor the answer to the user's role and answer in the language the user writes in. Be brief: at most 6 short lines or bullets, no preamble, no headings.
Always cite artifact IDs exactly as written (FR-001, SC-001, US1, T009, A1, Q2) so the user can jump to them.
Use "- " for bullets and **bold** sparingly. Never claim you changed files; you only suggest.`;

export interface CopilotTurn { role: 'user' | 'assistant'; content: string }

/** One Copilot answer. API errors are thrown for the caller to map. */
export async function createReply(client: Anthropic, model: string, context: string, messages: CopilotTurn[]): Promise<string> {
  const response = await client.beta.messages.create({
    model,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    // Re-run a safety decline on Anthropic's recommended fallback model instead of failing the turn.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: `${SYSTEM_PROMPT}\n\nPROJECT CONTEXT\n${context}`,
    messages
  });
  if (response.stop_reason === 'refusal') return 'Copilot can’t help with that request. Try rephrasing it around this feature’s artifacts.';
  const text = response.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
  return text || 'Copilot returned an empty answer. Try again.';
}
