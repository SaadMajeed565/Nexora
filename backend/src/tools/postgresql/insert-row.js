// PostgreSQL — Insert row. Self-contained: only requires pg + zod.
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

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

module.exports = {
  toolkit: 'postgresql',
  name: 'Insert row',
  description: 'Inserts one row into a PostgreSQL table.',
  input: z.object({
    table: z.string().min(1, 'A table name is required'),
    data: nonEmptyRecord('A data object with at least one field is required'),
  }),
  run: async (credentials, input) => {
    assertIdentifier(input.table, 'table');
    const client = await getClient(credentials);
    try {
      const keys = Object.keys(input.data);
      keys.forEach((k) => assertIdentifier(k, 'column'));
      const sql = `INSERT INTO "${input.table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
      const res = await client.query(sql, keys.map((k) => input.data[k]));
      return { row: res.rows[0] || null, affectedRows: res.rowCount };
    } finally {
      await client.end();
    }
  },
};
