// HTTP — Make request. Self-contained: only uses Node's built-in global
// fetch + zod — no extra SDK. Copyable verbatim into a generated agent
// project — no Nexora backend imports, no sibling tool files. Credentials
// are passed in by the caller (from the secrets store); this file never
// reads process.env and never hardcodes a key.
//
// Expected credentials: none — this tool takes no credentials. Any
// authentication for the target API goes in the request headers input.
//
// Note: HTTP error statuses do NOT throw — the caller gets the status and
// ok: false so it can decide what to do. Only network failures throw.
const { z } = require('zod');

const MAX_BODY_CHARS = 50000;

module.exports = {
  toolkit: 'http',
  name: 'Make request',
  description: 'Makes an HTTP request to any REST API and returns the status and body.',
  input: z.object({
    method: z
      .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])
      .optional()
      .default('GET'),
    url: z
      .string()
      .url('A valid URL is required')
      .refine(
        (u) => u.startsWith('http://') || u.startsWith('https://'),
        'Only http(s) URLs are allowed'
      ),
    headers: z.record(z.string()).optional(),
    body: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const res = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body:
        input.method === 'GET' || input.method === 'HEAD' ? undefined : input.body,
    });
    const text = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      body: text.slice(0, MAX_BODY_CHARS),
      truncated: text.length > MAX_BODY_CHARS,
    };
  },
};
