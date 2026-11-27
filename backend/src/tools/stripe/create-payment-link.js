// Stripe — Create payment link. Self-contained: only requires stripe + zod.
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
  name: 'Create payment link',
  description: 'Creates a Stripe payment link for a product at a fixed price.',
  input: z.object({
    productName: z.string().min(1, 'A product name is required'),
    amount: z
      .number()
      .int()
      .min(1, 'Amount (in the smallest currency unit, e.g. cents) must be at least 1'),
    currency: z.string().min(1, 'A currency is required').optional().default('usd'),
    quantity: z.number().int().min(1).optional().default(1),
  }),
  run: async (credentials, input) => {
    const stripe = getClient(credentials);
    const product = await stripe.products.create({ name: input.productName });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: input.amount,
      currency: input.currency,
    });
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: input.quantity }],
    });
    return { id: link.id, url: link.url };
  },
};
