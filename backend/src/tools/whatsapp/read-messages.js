// WhatsApp — Read incoming messages. Self-contained: only requires zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. This is a pure parser for the webhook
// payload Meta posts when a customer replies; it needs no credentials and
// never reads process.env.
//
// Expected input: the webhook payload object Meta sends.
const { z } = require('zod');

module.exports = {
  toolkit: 'whatsapp',
  name: 'Read incoming messages',
  description:
    'Parses a WhatsApp webhook payload (what Meta posts when a customer replies) into a list of messages. No credentials needed — this is a pure parser.',
  input: z.object({
    payload: z.record(z.any()),
  }),
  run: async (_credentials, input) => {
    const messages = [];
    const entries = Array.isArray(input.payload.entry) ? input.payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value || {};
        const incoming = Array.isArray(value.messages) ? value.messages : [];
        for (const m of incoming) {
          messages.push({
            from: m.from,
            messageId: m.id,
            timestamp: m.timestamp,
            type: m.type,
            text: m.text ? m.text.body : m.type === 'text' ? '' : `[${m.type}]`,
          });
        }
      }
    }
    return { messages };
  },
};
