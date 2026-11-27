// Schedule — Next runs. Self-contained: only requires cron-parser + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: none — this tool takes no credentials. It only
// computes dates locally from a cron expression.
const { CronExpressionParser } = require('cron-parser');
const { z } = require('zod');

module.exports = {
  toolkit: 'schedule',
  name: 'Next runs',
  description: 'Computes the next run times for a cron expression.',
  input: z.object({
    expression: z.string().min(1, 'A cron expression is required'),
    count: z.number().int().min(1).max(20).optional().default(5),
  }),
  run: async (credentials, input) => {
    let runs;
    try {
      runs = CronExpressionParser.parse(input.expression)
        .take(input.count)
        .map((d) => d.toDate().toISOString());
    } catch (e) {
      throw new Error(`schedule: invalid cron expression: ${e.message}`);
    }
    return { expression: input.expression, nextRuns: runs, count: runs.length };
  },
};
