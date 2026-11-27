// WooCommerce — Create product. Self-contained: only uses Node's built-in
// global fetch + zod — no extra SDK. Copyable verbatim into a generated
// agent project — no Nexora backend imports, no sibling tool files.
// Credentials are passed in by the caller (from the secrets store); this
// file never reads process.env and never hardcodes a key.
//
// Expected credentials: { siteUrl, consumerKey, consumerSecret }
// (siteUrl is the store site URL, consumerKey and consumerSecret are the
// WooCommerce REST API keys).
const { z } = require('zod');

function getCredentials(credentials) {
  const { siteUrl, consumerKey, consumerSecret } = credentials || {};
  if (!siteUrl || !consumerKey || !consumerSecret) {
    throw new Error('woocommerce: credentials are required (siteUrl, consumerKey, consumerSecret)');
  }
  return { siteUrl, consumerKey, consumerSecret };
}

module.exports = {
  toolkit: 'woocommerce',
  name: 'Create product',
  description: 'Creates a product in a WooCommerce store.',
  input: z.object({
    name: z.string().min(1, 'A product name is required'),
    price: z.string().min(1, 'A price is required (as a string, e.g. "19.99")'),
    description: z.string().optional(),
    status: z.enum(['publish', 'draft']).optional().default('draft'),
  }),
  run: async (credentials, input) => {
    const { siteUrl, consumerKey, consumerSecret } = getCredentials(credentials);
    const base = siteUrl.replace(/\/+$/, '') + '/wp-json/wc/v3';
    const res = await fetch(`${base}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        regular_price: input.price,
        ...(input.description ? { description: input.description } : {}),
        status: input.status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.message || 'unknown error';
      throw new Error(`woocommerce: create product failed (${res.status}): ${msg}`);
    }
    return { id: data.id, name: data.name };
  },
};
