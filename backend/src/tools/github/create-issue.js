// GitHub — Create issue. Self-contained: only requires octokit + zod.
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
  name: 'Create issue',
  description: 'Opens a new issue in a repo.',
  input: z.object({
    owner: z.string().min(1, 'A repo owner is required'),
    repo: z.string().min(1, 'A repo name is required'),
    title: z.string().min(1, 'An issue title is required'),
    body: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const octokit = getClient(credentials);
    const { data } = await octokit.rest.issues.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
    });
    return { number: data.number, url: data.html_url };
  },
};
