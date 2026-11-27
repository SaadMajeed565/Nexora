// Email — Read emails. Self-contained: only requires imapflow + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { smtp: { ... }, imap: { host, port, secure,
// user, pass } } (this tool uses only imap).
const { ImapFlow } = require('imapflow');
const { z } = require('zod');

function getClient(credentials) {
  const imap = (credentials && credentials.imap) || {};
  if (!imap.host || !imap.user || !imap.pass) {
    throw new Error('email: IMAP credentials are required (imap.host, imap.user, imap.pass)');
  }
  return new ImapFlow({
    host: imap.host,
    port: imap.port || 993,
    secure: imap.secure !== false,
    auth: { user: imap.user, pass: imap.pass },
    logger: false,
  });
}

module.exports = {
  toolkit: 'email',
  name: 'Read emails',
  description: 'Reads the most recent emails from an IMAP mailbox.',
  input: z.object({
    mailbox: z.string().min(1, 'A mailbox name is required').optional().default('INBOX'),
    limit: z.number().int().min(1).max(50).optional().default(10),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    await client.connect();
    const lock = await client.getMailboxLock(input.mailbox);
    try {
      const total = client.mailbox && client.mailbox.exists ? client.mailbox.exists : 0;
      const messages = [];
      if (total > 0) {
        const start = Math.max(1, total - input.limit + 1);
        for await (const msg of client.fetch(`${start}:*`, { envelope: true })) {
          const env = msg.envelope || {};
          messages.push({
            uid: msg.uid,
            subject: env.subject || null,
            from: env.from && env.from[0] ? env.from[0].address || null : null,
            date: env.date ? new Date(env.date).toISOString() : null,
          });
        }
      }
      messages.reverse(); // newest first
      return { messages, count: messages.length };
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }
  },
};
