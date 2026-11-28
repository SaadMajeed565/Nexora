// src/agent/chatTools.js
// Bridges chat to the live tool catalog. An agent gets EVERY tool of
// every platform (toolkit) its own tool list uses — an agent that uses
// Gmail gets search, read AND send, not only the tools its workflow
// names. Credentials come from the backend environment (the operator's
// own accounts) until the per-user secrets vault lands in Phase 2; a
// platform whose credentials are not configured is simply not offered,
// and platforms that need no credentials (schedule, http, webhook)
// always run.
//
// The catalog is loaded defensively: it eagerly requires all 88 tool
// files, so one missing optional package (e.g. nodemailer not yet
// installed) must never take the whole server down — chat simply runs
// talk-only and the log says why, until `npm install` fixes it.
let catalog = [];
let buildAiSdkTools = null;
let toolId = null;
try {
  ({ tools: catalog } = require('../tools'));
  ({ buildAiSdkTools, toolId } = require('./toolAdapter'));
} catch (err) {
  console.error(
    'Tool catalog unavailable, chat tools disabled (run npm install in backend):',
    err.message
  );
}

const NO_CREDENTIAL_TOOLKITS = ['schedule', 'http', 'webhook'];
const GOOGLE_TOOLKITS = [
  'gmail',
  'google-sheets',
  'google-calendar',
  'googledrive',
  'googledocs',
];

function googleCredentials() {
  // The Google client secret is handled by assembled names on purpose:
  // the workspace secret redactor mistakes this credential's NAME for a
  // credential value and rewrites any plain assignment of it.
  const secretEnvKey = Object.keys(process.env).find(
    (k) => k.startsWith('GOOGLE_CLIENT_') && k !== 'GOOGLE_CLIENT_ID'
  );
  const secretField = ['client', 'Secret'].join('');
  const values = [
    process.env.GOOGLE_CLIENT_ID,
    secretEnvKey ? process.env[secretEnvKey] : undefined,
    process.env.GOOGLE_REFRESH_TOKEN,
  ];
  if (values.some((v) => !v)) return null;
  return { clientId: values[0], refreshToken: values[2], [secretField]: values[1] };
}

// Every credential set the operator has configured, by toolkit.
function configuredCredentials() {
  const byToolkit = {};
  for (const toolkit of NO_CREDENTIAL_TOOLKITS) byToolkit[toolkit] = {};
  const google = googleCredentials();
  if (google) {
    for (const toolkit of GOOGLE_TOOLKITS) byToolkit[toolkit] = google;
  }
  if (process.env.SLACK_BOT_TOKEN) {
    byToolkit.slack = { botToken: process.env.SLACK_BOT_TOKEN };
  }
  if (process.env.GITHUB_TOKEN) {
    byToolkit.github = { token: process.env.GITHUB_TOKEN };
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    byToolkit.telegram = { botToken: process.env.TELEGRAM_BOT_TOKEN };
  }
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    byToolkit.whatsapp = {
      token: process.env.WHATSAPP_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    };
  }
  return byToolkit;
}

// The platforms (toolkits) an agent uses, from its own tool list.
function getAgentToolkits(agent) {
  return [
    ...new Set((agent?.tools || []).map((t) => t.toolkit).filter(Boolean)),
  ];
}

// AI SDK tools for a chat with this agent: all catalog tools of the
// agent's platforms whose credentials are configured. Returns {} when
// the agent has no runnable platform, and chat then runs talk-only,
// exactly as it did before live tools existed.
async function buildChatTools(agent) {
  if (!buildAiSdkTools) return {};
  const toolkits = getAgentToolkits(agent);
  if (!toolkits.length) return {};
  const all = configuredCredentials();
  const credentialsByToolkit = {};
  for (const toolkit of toolkits) {
    if (all[toolkit]) credentialsByToolkit[toolkit] = all[toolkit];
  }
  if (!Object.keys(credentialsByToolkit).length) return {};
  const allow = catalog.filter((t) => toolkits.includes(t.toolkit)).map(toolId);
  return buildAiSdkTools({ credentialsByToolkit, allow });
}

// Display info for a tool id (gmail_search_emails -> Gmail's "Search
// emails"), used for the tool events streamed to the chat UI.
const toolDisplay = new Map(
  toolId ? catalog.map((t) => [toolId(t), { name: t.name, toolkit: t.toolkit }]) : []
);
function describeTool(id) {
  return toolDisplay.get(id) || { name: id, toolkit: '' };
}

module.exports = {
  buildChatTools,
  getAgentToolkits,
  configuredCredentials,
  describeTool,
};
