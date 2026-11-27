// MongoDB — Find documents. Self-contained: only requires mongodb + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { uri } (a MongoDB connection string, e.g. an
// Atlas URI). The client connects per call and is always closed.
const { MongoClient } = require('mongodb');
const { z } = require('zod');

function getClient(credentials) {
  const { uri } = credentials || {};
  if (!uri) {
    throw new Error('mongodb: a connection string (uri) is required');
  }
  return new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
}

// $where runs arbitrary JavaScript on the server — never allow it in a
// filter, at any depth (including inside $or/$and arrays).
function assertSafeFilter(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, val] of Object.entries(value)) {
    if (key === '$where') {
      throw new Error('mongodb: $where is not allowed in filters');
    }
    assertSafeFilter(val);
  }
}

module.exports = {
  toolkit: 'mongodb',
  name: 'Find documents',
  description: 'Finds documents in a MongoDB collection matching a filter.',
  input: z.object({
    database: z.string().min(1, 'A database name is required'),
    collection: z.string().min(1, 'A collection name is required'),
    filter: z.record(z.any()).optional().default({}),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    assertSafeFilter(input.filter);
    const client = getClient(credentials);
    try {
      await client.connect();
      const docs = await client
        .db(input.database)
        .collection(input.collection)
        .find(input.filter)
        .limit(input.limit)
        .toArray();
      return { documents: docs, count: docs.length };
    } finally {
      await client.close();
    }
  },
};
