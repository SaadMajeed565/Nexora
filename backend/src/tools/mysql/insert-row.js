// MySQL — Insert row. Self-contained: only requires mysql2/promise + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { host, port, user, password, database }.
// Values are ALWAYS bound as ? parameters, never interpolated; table and
// column names cannot be parameters in SQL, so they are validated
// against a strict identifier pattern instead.
const mysql = require('mysql2/promise');
const { z } = require('zod');

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

function assertIdentifier(name, what) {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`mysql: invalid ${what} name: ${name}`);
  }
}

async function getConnection(credentials) {
  const { host, user, database } = credentials || {};
  if (!host || !user || !database) {
    throw new Error('mysql: credentials are required (host, user, database)');
  }
  return mysql.createConnection({
    host,
    port: credentials.port || 3306,
    user,
    password: credentials.password || '',
    database,
  });
}

function whereClause(filter) {
  const keys = Object.keys(filter || {});
  keys.forEach((k) => assertIdentifier(k, 'column'));
  return {
    clause: keys.map((k) => `\`${k}\` = ?`).join(' AND '),
    values: keys.map((k) => filter[k]),
  };
}

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

module.exports = {
  toolkit: 'mysql',
  name: 'Insert row',
  description: 'Inserts one row into a MySQL table.',
  input: z.object({
    table: z.string().min(1, 'A table name is required'),
    data: nonEmptyRecord('A data object with at least one field is required'),
  }),
  run: async (credentials, input) => {
    assertIdentifier(input.table, 'table');
    const conn = await getConnection(credentials);
    try {
      const keys = Object.keys(input.data);
      keys.forEach((k) => assertIdentifier(k, 'column'));
      const sql = `INSERT INTO \`${input.table}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
      const [result] = await conn.query(sql, keys.map((k) => input.data[k]));
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    } finally {
      await conn.end();
    }
  },
};
