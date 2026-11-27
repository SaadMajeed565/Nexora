// Stripe — List payments. Self-contained: only requires stripe + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { secretKey } (a Stripe secret key).
const Stripe = require('stripe');
const { z } = require('zod');

function getClient(credentials) {
  const { secretKey } = credentials || {};
  if (!secretKey) {
    throw new Error('stripe: credentials are required (secretKey)');
  }
  return new Stripe(secretKey);
}

module.exports = {
  toolkit: 'stripe',
  name: 'List payments',
  description: 'Lists recent Stripe payment intents.',
  input: z.object({
    limit: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const stripe = getClient(credentials);
    const res = await stripe.paymentIntents.list({ limit: input.limit });
    const payments = (res.data || []).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
    }));
    return { payments, count: payments.length };
  },
};
