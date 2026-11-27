// Webhook — Send webhook. Self-contained: only uses Node's built-in global
// fetch + zod — no extra SDK. Copyable verbatim into a generated agent
// project — no Nexora backend imports, no sibling tool files. Credentials
// are passed in by the caller (from the secrets store); this file never
// reads process.env and never hardcodes a key.
//
// Expected credentials: { secret? } — optional. When present, the secret
// is sent as an X-Webhook-Secret header so the receiver can verify the
// call came from this agent.
const { z } = require('zod');

module.exports = {
  toolkit: 'webhook',
  name: 'Send webhook',
  description: 'Sends a JSON payload to a webhook URL (outgoing webhook).',
  input: z.object({
    url: z
      .string()
      .url('A valid URL is required')
      .refine(
        (u) => u.startsWith('http://') || u.startsWith('https://'),
        'Only http(s) URLs are allowed'
      ),
    payload: z.record(z.any()),
    headers: z.record(z.string()).optional(),
  }),
  run: async (credentials, input) => {
    const secret = (credentials && credentials.secret) || null;
    const headers = {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Webhook-Secret': secret } : {}),
      ...(input.headers || {}),
    };
    const res = await fetch(input.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.payload),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`webhook: send failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return { status: res.status, body: text.slice(0, 1000) };
  },
};
