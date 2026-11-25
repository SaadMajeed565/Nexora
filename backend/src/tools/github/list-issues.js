// GitHub — List issues. Self-contained: only requires octokit + zod.
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

module.exports = {
  toolkit: 'github',
  name: 'List issues',
  description: 'Lists open issues in a repo.',
  input: z.object({
    owner: z.string().min(1, 'A repo owner is required'),
    repo: z.string().min(1, 'A repo name is required'),
    state: z.enum(['open', 'closed', 'all']).optional().default('open'),
  }),
  run: async (credentials, input) => {
    const octokit = getClient(credentials);
    const { data } = await octokit.rest.issues.listForRepo({
      owner: input.owner,
      repo: input.repo,
      state: input.state,
    });
    return {
      issues: data.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
      })),
    };
  },
};
