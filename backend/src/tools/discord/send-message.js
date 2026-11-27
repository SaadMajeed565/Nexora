// Discord — Send message. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Send message',
  description: 'Sends a message to a Discord channel.',
  input: z.object({
    channelId: z.string().min(1, 'A channel id is required'),
    content: z.string().min(1, 'A message is required'),
  }),
  run: async (credentials, input) => {
    const { token } = getCredentials(credentials);
    const res = await fetch(
      `https://discord.com/api/v10/channels/${input.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: input.content }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `discord: send failed (${res.status}): ${data.message || 'unknown error'}`
      );
    }
    return { messageId: data.id, channelId: data.channel_id };
  },
};
