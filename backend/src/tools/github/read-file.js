// GitHub — Read file. Self-contained: only requires octokit + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { token } (a GitHub personal access token or
// fine-grained token with repo access).
const { Octokit } = require('octokit');
const { z } = require('zod');

function getClient(credentials) {
  const { token } = credentials || {};
  if (!token) {
    throw new Error('github: credentials are required (token)');
  }
  return new Octokit({ auth: token });
}

// Cap on returned text so a huge file cannot flood the model context.
const MAX_CONTENT_CHARS = 50000;

module.exports = {
  toolkit: 'github',
  name: 'Read file',
  description: "Reads a file's content from a repo.",
  input: z.object({
    owner: z.string().min(1, 'A repo owner is required'),
    repo: z.string().min(1, 'A repo name is required'),
    path: z.string().min(1, 'A file path in the repo is required'),
    ref: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const octokit = getClient(credentials);
    const { data } = await octokit.rest.repos.getContent({
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      ref: input.ref,
    });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('github: path is not a file');
    }
    const buf = Buffer.from(data.content, 'base64');
    if (buf.includes(0)) {
      throw new Error('github: file is not readable as text (binary)');
    }
    const content = buf.toString('utf8');
    if (content.length > MAX_CONTENT_CHARS) {
      return { name: data.name, path: data.path, content: content.slice(0, MAX_CONTENT_CHARS), truncated: true };
    }
    return {
      name: data.name,
      path: data.path,
      content,
    };
  },
};
