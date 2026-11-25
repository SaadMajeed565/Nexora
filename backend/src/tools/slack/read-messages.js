// Slack — Read messages. Self-contained: only requires @slack/web-api +
// zod. Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { botToken } (a Slack bot token, xoxb-...).
const { WebClient } = require('@slack/web-api');
const { z } = require('zod');

function getClient(credentials) {
  const { botToken } = credentials || {};
  if (!botToken) {
    throw new Error('slack: credentials are required (botToken)');
  }
  return new WebClient(botToken);
}

module.exports = {
  toolkit: 'slack',
  name: 'Read messages',
  description: 'Lists recent messages in a Slack channel.',
  input: z.object({
    channel: z.string().min(1, 'A channel id is required'),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    const res = await client.conversations.history({
      channel: input.channel,
      limit: input.limit,
    });
    return {
      messages: (res.messages || []).map((m) => ({
        user: m.user,
        text: m.text,
        ts: m.ts,
      })),
    };
  },
};
