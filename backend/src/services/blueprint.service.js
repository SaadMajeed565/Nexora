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
  // Decision steps route with branches + else INSTEAD of next. Branches
  // cover the named cases (if / case); else is the step id for all other
  // cases. Every goto/else must reference a step id in the same workflow
  // (checked by validateWorkflowRefs — Zod alone cannot see across steps).
  branches: z
    .array(
      z.object({
        when: z.string().min(1, 'Branch condition is required'),
        goto: z.string().min(1, 'Branch target step id is required'),
      })
    )
    .optional(),
  else: z.string().min(1, 'Else target step id is required').optional(),
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
- tools are only the outside services the agent actually calls (email, sheets, calendar, chat apps, databases, APIs). The agent's own thinking is NOT a tool: never list an AI-model toolkit (openai, anthropic, gemini, huggingface, ollama) or any "AI Assistant" entry for classifying, reasoning, judging sentiment, summarizing, or writing answers. Thinking happens in decision and response steps, which name no tool.
- workflow: a connected chain of steps. The first step is a trigger. Step types: trigger, tool, decision, response. A tool step names the tool it uses in "tool"; decision and response steps have no "tool".
- Flow between steps: a non-decision step points to the following step with "next"; the last step has no "next". A decision step has NO "next" — it routes with "branches" plus "else". "branches" is a list of { "when": "<the case, in plain words>", "goto": "<id of the step for that case>" } and "else" is the id of the step for every other case. Every "goto" and "else" must be the id of a step in the same workflow, and paths should rejoin the main chain where they come back together. NEVER put if/then/else inside "config" — config holds only a tool step's settings.
- Variables: a step's config may use {{variables}} only when an earlier step produces that value or it comes from the trigger input (for example the sender's email in the incoming message). Name what a lookup or analysis step produces in its config, for example "produces": "order_details", so later steps can rely on it.
- After any search or lookup step that can come back empty, the next step must be a decision whose branches handle the not-found case: one branch or the else leads to a response step that asks for more detail or hands over to a human.
- Order steps naturally: classify or assess first, then act on the result (check sentiment before deciding to escalate; look up the data before answering from it).
- triggers: how the agent starts (for example "new email arrives", "user sends a message").
- fallback: one sentence describing what the agent does when it cannot complete a task (ask the user, log the failure, retry once).
- Keep names short and clear. Do not invent tools that do not exist.`;

// Every next / else / branches[].goto must reference a step id in the
// same workflow. A dangling pointer is a broken plan: the review graph
// cannot draw it and a runner cannot follow it. Returns an error string,
// or null when the workflow is sound. Shared by every blueprint write
// path (generate + review update).
function validateWorkflowRefs(workflow) {
  const ids = new Set((workflow || []).map((s) => s.id));
  for (const step of workflow || []) {
    const refs = [];
    if (step.next) refs.push(step.next);
    if (step.else) refs.push(step.else);
    for (const branch of step.branches || []) refs.push(branch.goto);
    for (const ref of refs) {
      if (!ids.has(ref)) {
        return `Step "${step.name}" points to step "${ref}", which does not exist in the workflow`;
      }
    }
  }
  return null;
}

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

module.exports = { blueprintSchema, generateBlueprint, validateWorkflowRefs };
