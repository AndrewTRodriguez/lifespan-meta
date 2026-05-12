import Anthropic from '@anthropic-ai/sdk';
import {
  SOLVER_SYSTEM_PROMPT,
  ADVISOR_SYSTEM_PROMPT,
  SUBMIT_PREDICTION_TOOL,
  SUBMIT_GRADE_TOOL,
} from './prompts';
import type { Entry, SolverOutput, AdvisorOutput } from './types';

export const MODEL = 'claude-sonnet-4-6';
export const TEMPERATURE = 0;

export async function runSolver(
  client: Anthropic,
  promptSent: string,
): Promise<SolverOutput> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    temperature: TEMPERATURE,
    system: SOLVER_SYSTEM_PROMPT,
    tools: [SUBMIT_PREDICTION_TOOL],
    tool_choice: { type: 'tool', name: 'submit_prediction' },
    messages: [{ role: 'user', content: promptSent }],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Solver did not return a tool_use block');
  }
  return toolUse.input as SolverOutput;
}

export async function runAdvisor(
  client: Anthropic,
  entry: Entry,
  promptSent: string,
  solverOutput: SolverOutput,
): Promise<AdvisorOutput> {
  const userMessage = `Entry shown to the model:
${promptSent}

Ground truth from GenAge:
- Longevity influence: ${entry.longevity_influence}
- Organism: ${entry.organism}
- Gene symbol (unblinded): ${entry.symbol}

Model's prediction:
${JSON.stringify(solverOutput, null, 2)}

Grade this prediction.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    temperature: TEMPERATURE,
    system: ADVISOR_SYSTEM_PROMPT,
    tools: [SUBMIT_GRADE_TOOL],
    tool_choice: { type: 'tool', name: 'submit_grade' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Advisor did not return a tool_use block');
  }
  return toolUse.input as AdvisorOutput;
}
