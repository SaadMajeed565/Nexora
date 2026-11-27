// Stripe — Create customer. Self-contained: only requires stripe + zod.
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
  name: 'Create customer',
  description: 'Creates a customer in Stripe.',
  input: z.object({
    email: z.string().email('A valid email is required'),
    name: z.string().min(1, 'A name is required').optional(),
    description: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const stripe = getClient(credentials);
    const customer = await stripe.customers.create({
      email: input.email,
      ...(input.name ? { name: input.name } : {}),
      ...(input.description ? { description: input.description } : {}),
    });
    return { id: customer.id, email: customer.email };
  },
};
