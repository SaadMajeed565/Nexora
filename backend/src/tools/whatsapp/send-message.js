// WhatsApp — Send message (official WhatsApp Business Cloud API, via
// Meta's Graph API). Self-contained: only uses Node's built-in global fetch
// + zod — no extra SDK. Copyable verbatim into a generated agent project —
// no Nexora backend imports, no sibling tool files. Credentials are passed
// in by the caller (from the secrets store); this file never reads
// process.env and never hardcodes a key.
//
// Expected credentials: { token, phoneNumberId }
// (token = WhatsApp Business API access token, phoneNumberId = the sender
// phone number id from the Meta developer dashboard.)
//
// Note: business-initiated messages need an approved template; replies
// inside a 24-hour customer window can be free text. Meta charges per
// conversation after the free allowance. Unofficial WhatsApp Web libraries
// are NOT used — they break WhatsApp's terms and the number can get banned.
const { z } = require('zod');

const GRAPH_API_VERSION = 'v21.0';

function getCredentials(credentials) {
  const { token, phoneNumberId } = credentials || {};
  if (!token || !phoneNumberId) {
    throw new Error('whatsapp: credentials are required (token, phoneNumberId)');
  }
  return { token, phoneNumberId };
}

module.exports = {
  toolkit: 'whatsapp',
  name: 'Send message',
  description: 'Sends a WhatsApp text message to a customer.',
  input: z.object({
    to: z.string().min(1, 'A recipient phone number is required (country code, no +)'),
    message: z.string().min(1, 'A message is required'),
  }),
  run: async (credentials, input) => {
    const { token, phoneNumberId } = getCredentials(credentials);
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'text',
          text: { preview_url: false, body: input.message },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `whatsapp: send failed (${res.status}): ${data.error ? data.error.message : JSON.stringify(data)}`
      );
    }
    return { messageId: data.messages && data.messages[0] && data.messages[0].id };
  },
};
