// Shopify — Create product. Self-contained: only uses Node's built-in
// global fetch + zod — no extra SDK. Copyable verbatim into a generated
// agent project — no Nexora backend imports, no sibling tool files.
// Credentials are passed in by the caller (from the secrets store); this
// file never reads process.env and never hardcodes a key.
//
// Expected credentials: { shop, accessToken } (shop is the store domain
// like 'mystore.myshopify.com', accessToken is the Admin API access token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { shop, accessToken } = credentials || {};
  if (!shop || !accessToken) {
    throw new Error('shopify: credentials are required (shop, accessToken)');
  }
  return { shop, accessToken };
}

module.exports = {
  toolkit: 'shopify',
  name: 'Create product',
  description: 'Creates a product in a Shopify store.',
  input: z.object({
    title: z.string().min(1, 'A product title is required'),
    description: z.string().optional(),
    status: z.enum(['active', 'draft']).optional().default('draft'),
  }),
  run: async (credentials, input) => {
    const { shop, accessToken } = getCredentials(credentials);
    const base = `https://${shop}/admin/api/2024-10`;
    const res = await fetch(`${base}/products.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: {
          title: input.title,
          ...(input.description ? { body_html: input.description } : {}),
          status: input.status,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors || 'unknown error');
      throw new Error(`shopify: create product failed (${res.status}): ${msg}`);
    }
    return { id: data.product.id, title: data.product.title };
  },
};
