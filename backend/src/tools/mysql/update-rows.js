// MySQL — Update rows. Self-contained: only requires mysql2/promise + zod.
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
  name: 'Update rows',
  description: 'Updates rows in a MySQL table that match a filter.',
  input: z.object({
    table: z.string().min(1, 'A table name is required'),
    // A non-empty filter is required: an empty one would update the
    // whole table.
    filter: nonEmptyRecord('A filter with at least one field is required'),
    set: nonEmptyRecord('A set object with at least one field is required'),
  }),
  run: async (credentials, input) => {
    assertIdentifier(input.table, 'table');
    const conn = await getConnection(credentials);
    try {
      const setKeys = Object.keys(input.set);
      setKeys.forEach((k) => assertIdentifier(k, 'column'));
      const { clause, values } = whereClause(input.filter);
      const sql = `UPDATE \`${input.table}\` SET ${setKeys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE ${clause}`;
      const [result] = await conn.query(sql, [...setKeys.map((k) => input.set[k]), ...values]);
      return { affectedRows: result.affectedRows, changedRows: result.changedRows };
    } finally {
      await conn.end();
    }
  },
};
