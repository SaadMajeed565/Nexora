// Discord — Read messages. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { token } (a bot token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { token } = credentials || {};
  if (!token) {
    throw new Error('discord: credentials are required (token)');
  }
  return { token };
}

module.exports = {
  toolkit: 'discord',
  name: 'Read messages',
  description: 'Reads recent messages from a Discord channel.',
  input: z.object({
    channelId: z.string().min(1, 'A channel id is required'),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const { token } = getCredentials(credentials);
    const res = await fetch(
      `https://discord.com/api/v10/channels/${input.channelId}/messages?limit=${input.limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `discord: read failed (${res.status}): ${data.message || 'unknown error'}`
      );
    }
    const messages = (Array.isArray(data) ? data : []).map((m) => ({
      id: m.id,
      author: m.author ? m.author.username : null,
      content: m.content,
      timestamp: m.timestamp,
    }));
    return { messages, count: messages.length };
  },
};
