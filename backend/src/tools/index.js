// Tool catalog registry: loads every tool file (one file per tool, grouped
// in toolkit folders) and exports one catalog. Each tool file is
// self-contained (its own SDK + zod + Node built-ins only) so the Builder
// can copy individual tool files verbatim into a generated agent project.
// This registry only requires the tool files in this same folder tree.
const tools = [
  require('./gmail/search-emails'),
  require('./gmail/read-email'),
  require('./gmail/send-email'),
  require('./google-sheets/read-rows'),
  require('./google-sheets/find-row'),
  require('./google-sheets/append-row'),
  require('./google-sheets/update-row'),
  require('./google-calendar/list-events'),
  require('./google-calendar/create-event'),
  require('./google-calendar/update-event'),
  require('./googledrive/search-files'),
  require('./googledrive/read-file'),
  require('./whatsapp/send-message'),
  require('./whatsapp/read-messages'),
  require('./telegram/send-message'),
  require('./telegram/read-messages'),
  require('./slack/send-message'),
  require('./slack/read-messages'),
  require('./github/list-issues'),
  require('./github/create-issue'),
  require('./github/read-file'),
];

// Toolkits, grouped from the flat tool list: [{ toolkit, tools }].
const toolkits = [...new Set(tools.map((t) => t.toolkit))].map((toolkit) => ({
  toolkit,
  tools: tools.filter((t) => t.toolkit === toolkit),
}));

// Look up one tool by toolkit name + tool name. Returns undefined when not found.
function getTool(toolkit, name) {
  return tools.find((t) => t.toolkit === toolkit && t.name === name);
}

module.exports = { toolkits, tools, getTool };
