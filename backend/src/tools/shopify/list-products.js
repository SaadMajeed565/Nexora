// Shopify — List products. Self-contained: only uses Node's built-in
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
  name: 'List products',
  description: 'Lists products in a Shopify store.',
  input: z.object({
    limit: z.number().int().min(1).max(250).optional().default(20),
  }),
  run: async (credentials, input) => {
    const { shop, accessToken } = getCredentials(credentials);
    const base = `https://${shop}/admin/api/2024-10`;
    const res = await fetch(`${base}/products.json?limit=${input.limit}`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors || 'unknown error');
      throw new Error(`shopify: list products failed (${res.status}): ${msg}`);
    }
    const products = (data.products || []).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status || null,
      price: p.variants && p.variants[0] ? p.variants[0].price : null,
    }));
    return { products, count: products.length };
  },
};
