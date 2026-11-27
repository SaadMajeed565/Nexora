// PostgreSQL — Find rows. Self-contained: only requires pg + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { host, port, user, password, database }.
// Values are ALWAYS bound as $1, $2, ... parameters, never interpolated;
// table and column names cannot be parameters in SQL, so they are
// validated against a strict identifier pattern instead.
const { Client } = require('pg');
const { z } = require('zod');

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

function assertIdentifier(name, what) {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`postgresql: invalid ${what} name: ${name}`);
  }
}

async function getClient(credentials) {
  const { host, user, database } = credentials || {};
  if (!host || !user || !database) {
    throw new Error('postgresql: credentials are required (host, user, database)');
  }
  const client = new Client({
    host,
    port: credentials.port || 5432,
    user,
    password: credentials.password || '',
    database,
  });
  await client.connect();
  return client;
}

function whereClause(filter, startAt) {
  const keys = Object.keys(filter || {});
  keys.forEach((k) => assertIdentifier(k, 'column'));
  return {
    clause: keys.map((k, i) => `"${k}" = $${startAt + i}`).join(' AND '),
    values: keys.map((k) => filter[k]),
  };
}

module.exports = {
  toolkit: 'postgresql',
  name: 'Find rows',
  description: 'Finds rows in a PostgreSQL table matching a filter.',
  input: z.object({
    table: z.string().min(1, 'A table name is required'),
    filter: z.record(z.any()).optional().default({}),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    assertIdentifier(input.table, 'table');
    const client = await getClient(credentials);
    try {
      const { clause, values } = whereClause(input.filter, 1);
      const sql =
        `SELECT * FROM "${input.table}"` +
        (clause ? ` WHERE ${clause}` : '') +
        ` LIMIT $${values.length + 1}`;
      const res = await client.query(sql, [...values, input.limit]);
      return { rows: res.rows, count: res.rows.length };
    } finally {
      await client.end();
    }
  },
};
