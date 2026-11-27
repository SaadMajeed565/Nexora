// MongoDB — Update documents. Self-contained: only requires mongodb + zod.
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

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

module.exports = {
  toolkit: 'mongodb',
  name: 'Update documents',
  description: 'Sets fields on all documents in a MongoDB collection that match a filter.',
  input: z.object({
    database: z.string().min(1, 'A database name is required'),
    collection: z.string().min(1, 'A collection name is required'),
    // A non-empty filter is required: an empty one would update every
    // document in the collection.
    filter: nonEmptyRecord('A filter with at least one field is required'),
    set: nonEmptyRecord('A set object with at least one field is required'),
  }),
  run: async (credentials, input) => {
    assertSafeFilter(input.filter);
    const client = getClient(credentials);
    try {
      await client.connect();
      const result = await client
        .db(input.database)
        .collection(input.collection)
        .updateMany(input.filter, { $set: input.set });
      return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
    } finally {
      await client.close();
    }
  },
};
