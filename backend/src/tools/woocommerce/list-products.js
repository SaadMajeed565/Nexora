// WooCommerce — List products. Self-contained: only uses Node's built-in
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
  name: 'List products',
  description: 'Lists products in a WooCommerce store.',
  input: z.object({
    perPage: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const { siteUrl, consumerKey, consumerSecret } = getCredentials(credentials);
    const base = siteUrl.replace(/\/+$/, '') + '/wp-json/wc/v3';
    const res = await fetch(`${base}/products?per_page=${input.perPage}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.message || 'unknown error';
      throw new Error(`woocommerce: list products failed (${res.status}): ${msg}`);
    }
    const products = (Array.isArray(data) ? data : []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      status: p.status || null,
    }));
    return { products, count: products.length };
  },
};
