// Email — Send email. Self-contained: only requires nodemailer + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { smtp: { host, port, secure, user, pass },
// imap: { ... } } (this tool uses only smtp).
const nodemailer = require('nodemailer');
const { z } = require('zod');

function getTransport(credentials) {
  const smtp = (credentials && credentials.smtp) || {};
  if (!smtp.host || !smtp.user || !smtp.pass) {
    throw new Error('email: SMTP credentials are required (smtp.host, smtp.user, smtp.pass)');
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: !!smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

module.exports = {
  toolkit: 'email',
  name: 'Send email',
  description: 'Sends an email over SMTP.',
  input: z.object({
    to: z.string().min(1, 'A recipient email address is required'),
    subject: z.string().min(1, 'A subject is required'),
    body: z.string().min(1, 'A body is required'),
  }),
  run: async (credentials, input) => {
    const transport = getTransport(credentials);
    const info = await transport.sendMail({
      from: credentials.smtp.user,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });
    return { messageId: info.messageId };
  },
};
