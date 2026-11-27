const { generateText, Output } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { z } = require('zod');

// The blueprint contract (FR-2.2, SRS 3.4.4). One source of truth: the AI
// generates against it, and the review endpoint validates edits against it.
const toolSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  toolkit: z.string().min(1, 'Tool toolkit is required'),
  description: z.string().min(1, 'Tool description is required'),
});

const stepSchema = z.object({
  id: z.string().min(1, 'Step id is required'),
  name: z.string().min(1, 'Step name is required'),
  type: z.enum(['trigger', 'tool', 'decision', 'response']),
  tool: z.string().optional(),
  config: z.record(z.any()).optional(),
  next: z.string().optional(),
});

const blueprintSchema = z.object({
  name: z.string().min(2, 'Blueprint name is required'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  tools: z.array(toolSchema).min(1, 'At least one tool is required'),
  workflow: z.array(stepSchema).min(1, 'At least one workflow step is required'),
  triggers: z.array(z.string().min(1)).min(1, 'At least one trigger is required'),
  fallback: z.string().min(1, 'Fallback behaviour is required'),
});

const SYSTEM_PROMPT = `You are Nexora's Blueprint Engine. Turn the user's plain-language description into a structured agent blueprint as JSON matching the provided schema.

Rules:
- tools: use real, well-known toolkits where they fit (gmail, slack, google-calendar, github, google-sheets, telegram, whatsapp, googledocs, mongodb, discord, teams, notion, airtable, outlook, excel, webhook, http, schedule, email, mysql, postgresql, openai, anthropic, gemini, huggingface, ollama, hubspot, salesforce, pipedrive, trello, jira, stripe, shopify, woocommerce, googledrive). Each tool has a name, the toolkit it comes from, and a one-line description of what it does in this agent.
- workflow: a connected chain of steps. The first step is a trigger. Each step's "next" is the id of the following step; the last step has no "next". Step types: trigger, tool, decision, response. A tool step names the tool it uses.
- triggers: how the agent starts (for example "new email arrives", "user sends a message").
- fallback: one sentence describing what the agent does when it cannot complete a task (ask the user, log the failure, retry once).
- Keep names short and clear. Do not invent tools that do not exist.`;

// UC-04/UC-05: plain-language prompt -> structured blueprint via Gemini.
async function generateBlueprint(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('AI service not configured: set GEMINI_API_KEY in backend/.env');
    err.status = 503;
    throw err;
  }
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  // AI SDK v7: generateObject is deprecated — structured output now goes
  // through generateText with an Output.object setting.
  const { output } = await generateText({
    model: google(model),
    output: Output.object({ schema: blueprintSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  });
  return output;
}

module.exports = { blueprintSchema, generateBlueprint };
