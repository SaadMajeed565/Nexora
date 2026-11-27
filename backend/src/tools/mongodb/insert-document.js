// MongoDB — Insert document. Self-contained: only requires mongodb + zod.
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

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

module.exports = {
  toolkit: 'mongodb',
  name: 'Insert document',
  description: 'Inserts one document into a MongoDB collection.',
  input: z.object({
    database: z.string().min(1, 'A database name is required'),
    collection: z.string().min(1, 'A collection name is required'),
    document: nonEmptyRecord('A document with at least one field is required'),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    try {
      await client.connect();
      const result = await client
        .db(input.database)
        .collection(input.collection)
        .insertOne(input.document);
      return { insertedId: String(result.insertedId) };
    } finally {
      await client.close();
    }
  },
};
