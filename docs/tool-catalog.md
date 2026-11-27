# Nexora Tool Catalog (self-hosted, manual)

Decision 2026-11-25: Composio is OUT. No third-party tool platform, no hosted
service, no API key to a tool vendor. Every tool is a small Node.js file in this
project that talks straight to the service's own API, using that service's
official library. All of it runs on our own server. Nango was checked and
rejected: its free self-hosted edition covers Auth + Proxy only — no tool calls.
Tool calls need Enterprise (paid) or Nango Cloud (their server).

Revision 2026-11-25 (user): only the mostly-used services. HubSpot is OUT —
user says it is not good. Leads live in Google Sheets instead. WhatsApp is IN.

Revision 2026-11-27 (user): the catalog grows to the user's full list of 30
services. 25 new toolkits are added (discord, teams, notion, airtable,
outlook, excel, webhook, http, schedule, email, mysql, postgresql, openai,
anthropic, gemini, huggingface, ollama, hubspot, salesforce, pipedrive,
trello, jira, stripe, shopify, woocommerce). HubSpot is back IN — the user's
2026-11-27 list names it explicitly, superseding the 2026-11-25 removal.
Google Docs (added 2026-11-25) stays. New total: 35 toolkits, 88 tools.

Each tool = one function the generated agent can call. The Builder (Module 4)
picks tools from this catalog and generates the code that calls them. The
toolkit names below are the exact strings the Blueprint schema, the matching
service, and the 4 prebuilt agents already use — do not rename them, except
`hubspot` is removed and `whatsapp` is added (prebuilt agents + Blueprint
prompt must be updated to match).

## All toolkits — one batch (user: no "next batch", build all of them)

### gmail (`googleapis`)
- Search emails — list inbox messages by query (from, subject, unread)
- Read email — full body of one message
- Send email — send a new email, or reply inside a thread

### google-sheets (`googleapis`)
- Read rows — read a range from a sheet
- Find row — look up a row by a value (e.g. order number -> order status)
- Append row — add a row at the end
- Update row — change a row's cells
- (Also the leads store now that HubSpot is out: leads are rows in a sheet.)

### google-calendar (`googleapis`)
- List events — events in a time range, or free/busy slots
- Create event — book an appointment or demo call
- Update / cancel event — reschedule or cancel

### googledrive (`googleapis`)
- Search files — find files by name or content (the FAQ knowledge base)
- Read file — read a doc's text content

### googledocs (`googleapis`)
- Search documents — find Google Docs by title
- Read document — read a Doc as plain text (capped at 50,000 chars)
- Create document — create a new Doc, optionally with starting text
- Append text — add text to the end of a Doc
- Setup note: same Google OAuth credentials as Gmail, Sheets, Calendar and
  Drive (clientId, clientSecret, refreshToken) — one Google Cloud project
  covers all five Google toolkits.

### whatsapp (WhatsApp Business Cloud API, official Meta API)
- Send message — send a WhatsApp message to a customer
- Read incoming messages — receive replies via webhook
- Setup note: needs a Meta developer account + WhatsApp Business account +
  a phone number. Business-initiated messages need an approved template.
  Meta charges per conversation after the free allowance (1,000 service
  conversations/month free). Unofficial WhatsApp Web libraries are NOT used —
  they break WhatsApp's terms and the number can get banned.

### telegram (`node-telegram-bot-api`)
- Send message — send a message to a chat
- Read messages — receive replies (bot updates)
- Setup note: the easy one — free, just a bot token from BotFather.

### slack (`@slack/web-api`)
- Send message — post to a channel
- Read messages — list recent messages in a channel

### github (`octokit`)
- List issues — open issues in a repo
- Create issue — open a new issue
- Read file — read a file's content from a repo

### mongodb (`mongodb` driver)
- Find documents — find documents in a collection matching a filter (limit capped at 100)
- Insert document — insert one document into a collection
- Update documents — set fields on all documents matching a filter (empty filter rejected)
- Delete documents — delete all documents matching a filter (empty filter rejected)
- Setup note: needs a MongoDB connection string (`uri`) — e.g. a free Atlas
  cluster. This is an agent-facing database tool: it lets a generated agent
  read and write its own data. It is separate from the platform's own
  MongoDB (which stores users, workspaces, blueprints and agents and is
  never exposed as a tool). Safety: `$where` is rejected in any filter (it
  runs arbitrary JavaScript on the server), and update/delete refuse an
  empty filter so an agent cannot wipe or rewrite a whole collection by
  accident.

## Expansion batch (2026-11-27) — 25 new toolkits, 59 new tools

### discord (Discord Bot API, via fetch)
- Send message — post a message to a channel
- Read messages — recent messages in a channel
- Setup note: a bot token from the Discord developer portal; the bot must be
  in the server and have the MESSAGE_CONTENT intent for reading content.

### teams (Microsoft Graph, via fetch)
- Send message — post a message to a Teams channel
- List channels — channels in a team
- Setup note: one Microsoft app registration (clientId, clientSecret) plus a
  refreshToken covers teams, outlook and excel. The getAccessToken helper is
  duplicated in all 7 Microsoft tool files, like the Google getAuth pattern.

### notion (Notion API, via fetch)
- Search pages — pages the integration can see
- Read page — a page as plain text (capped at 50,000 chars)
- Create page — in a database or under another page
- Append text — add a paragraph to a page
- Setup note: an internal integration token; pages must be shared with the
  integration to be visible.

### airtable (Airtable API, via fetch)
- List records — records in a table
- Create record — add a record
- Update record — change fields of one record
- Setup note: a personal access token with access to the base.

### outlook (Microsoft Graph, via fetch)
- Search email — search the mailbox
- Read email — one message in full
- Send email — send from the mailbox
- Setup note: same Microsoft credentials as teams.

### excel (Microsoft Graph workbook API, via fetch)
- Read rows — the used range of a worksheet
- Append row — add a row after the used range
- Setup note: same Microsoft credentials as teams; the workbook is addressed
  by its OneDrive drive item id.

### webhook (outgoing HTTP, via fetch)
- Send webhook — POST a JSON payload to a URL, with an optional
  X-Webhook-Secret header from the stored secret
- Setup note: no account needed; the receiving URL is given per call and
  must be http(s).

### http (any REST API, via fetch)
- Make request — GET/POST/PUT/PATCH/DELETE/HEAD to any http(s) URL, returns
  status + body (capped at 50,000 chars). HTTP error statuses are returned,
  not thrown. In the AI SDK adapter, non-GET requests are confirm-gated as
  writes; plain GETs are reads.

### schedule (cron-parser)
- Next runs — the next N run times (ISO) for a cron expression. Pure
  computation: no credentials, no network.

### email (nodemailer + imapflow)
- Send email — over SMTP
- Read emails — most recent messages from an IMAP mailbox (envelope only)
- Setup note: any mailbox with SMTP + IMAP access; credentials carry both
  an smtp and an imap block.

### mysql (`mysql2`)
- Find rows — rows matching a filter (limit capped at 100)
- Insert row — insert one row
- Update rows — set fields on rows matching a filter (empty filter rejected)
- Delete rows — delete rows matching a filter (empty filter rejected)
- Setup note: same safety posture as mongodb — values are ALWAYS bound as
  ? parameters, never interpolated; table/column names cannot be SQL
  parameters, so they are validated against a strict identifier pattern
  (letters, digits, underscore) instead.

### postgresql (`pg`)
- Find rows / Insert row / Update rows / Delete rows — same four tools and
  the same safety rules as mysql, with $n placeholders and double-quoted
  identifiers.

### openai (`openai`)
- Chat completion — chat with an OpenAI model
- Generate image — generate an image (returns the image URL)
- Create embedding — an embedding vector for text

### anthropic (`@anthropic-ai/sdk`)
- Chat — chat with a Claude model

### gemini (`@google/generative-ai`)
- Chat — chat with a Gemini model (the standalone SDK, separate from the
  platform's own @ai-sdk/google usage)

### huggingface (Inference API, via fetch)
- Generate text — text generation with a hosted model

### ollama (local server, via fetch)
- Chat — chat with a locally served model
- List models — models available on the server
- Setup note: no key; credentials are just an optional baseUrl (default
  http://localhost:11434).

### hubspot (HubSpot CRM API, via fetch)
- Search contacts — search contacts by query
- Create contact — add a contact
- Setup note: a private app token. (Back in the catalog per the user's
  2026-11-27 list; see the revision note at the top.)

### salesforce (Salesforce REST API, via fetch)
- Query records — SOQL query
- Create record — create any object type
- Setup note: credentials are an accessToken + instanceUrl from a connected
  app OAuth flow.

### pipedrive (Pipedrive API, via fetch)
- Search deals — search deals by term
- Create deal — add a deal
- Create person — add a person (contact)

### trello (Trello API, via fetch)
- Get board lists — lists on a board
- Create card — add a card to a list
- Update card — rename, describe, or archive a card

### jira (Jira REST API, via fetch)
- Search issues — JQL search
- Create issue — create an issue (description in Atlassian Document Format)
- Update issue — change summary or description
- Setup note: basic auth with the account email + an API token; baseUrl is
  the Atlassian site, e.g. https://yourteam.atlassian.net.

### stripe (`stripe`)
- Create payment link — product + price + payment link in one call
- List payments — recent payment intents
- Create customer — add a customer
- Setup note: use a restricted secret key where possible.

### shopify (Shopify Admin API, via fetch)
- List products — products in the store
- Create product — add a product
- List orders — orders in the store
- Setup note: a custom app access token; shop is the store's
  *.myshopify.com domain.

### woocommerce (WooCommerce REST API, via fetch)
- List products — products in the store
- Create product — add a product (price as a string, like the API expects)
- List orders — orders in the store
- Setup note: a consumer key/secret pair from WooCommerce settings, sent as
  basic auth over https.

## Packaging into the generated agent (Module 4)

The generated agent must carry the tools it uses — it runs standalone in its
own Docker container, with no dependency on the Nexora backend. The Builder
copies ONLY the tool files that agent uses from `backend/src/tools/` into the
generated project (`generated-agents/<agent-id>/tools/`), and lists only the
npm packages those tools need in that project's package.json.

Hard rule: every toolkit file must be SELF-CONTAINED and COPYABLE. It may only
require its own npm package, zod, and Node built-ins. It must NOT require any
other backend file (no services, models, config, utils). No shared helper
outside `backend/src/tools/`.

Copying is per TOOL, not per toolkit: the Builder copies ONLY the tool files
that agent actually uses — nothing extra. So the catalog is one file per tool
(88 files), grouped in toolkit folders, e.g. backend/src/tools/gmail/ holds
search-emails.js, read-email.js, send-email.js. Each tool file exports one
tool and must be self-contained. The prebuilt agents' tools are catalog tools
too, so they get packaged the same way — e.g. the Customer Support agent uses
Gmail Read + Gmail Send + Order Lookup, so its generated project gets exactly
those three tool files, not the whole Gmail or Sheets set.

## Packaging into the generated agent

Every tool file in `backend/src/tools/` is self-contained and copyable: one
file per tool (88 files), grouped in toolkit folders, each only requiring its
own npm package (googleapis, @slack/web-api, octokit, node-telegram-bot-api, mongodb,
mysql2, pg, openai, @anthropic-ai/sdk, @google/generative-ai, stripe, nodemailer,
imapflow, cron-parser), zod, and Node built-ins (fetch for the REST-API tools).No tool file requires any other
Nexora backend file or a sibling tool file. The Builder (Module 4) copies
ONLY the tool files that agent actually uses into the generated project
(`generated-agents/<agent-id>/tools/`), plus the npm packages those tools need
in that project's `package.json`, so the generated agent runs standalone in
its own Docker container with no dependency on the Nexora backend.

## Security fixes (2026-11-25)

A security review of the catalog found and fixed these. All are covered by
tests in `~/workspace/nexora-test/e2e-tools.js` (583/583 after the fixes, 418 before the Google Docs toolkit was added).

1. **Gmail header injection** (`gmail/send-email.js`): header values (`to`,
   `subject`, `inReplyTo`) are interpolated into the raw MIME message. An LLM
   that has just read a malicious email could put `\r\nBcc: attacker@...` in
   a subject and silently copy every message out. Fixed: `safeHeader` rejects
   any value containing CR/LF, subjects are RFC 2047 encoded so non-ASCII
   (e.g. Urdu) arrives intact, and the body is base64 transfer-encoded.
2. **Sheets formula injection** (`google-sheets/append-row.js`,
   `update-row.js`): `valueInputOption` was `'USER_ENTERED'`, which makes
   Sheets evaluate formulas — an injected `=IMPORTDATA(...)` could leak sheet
   data. Both now use `'RAW'` (values are stored as plain text, never
   evaluated as formulas).
3. **Unbounded reads** (`googledrive/read-file.js`, `github/read-file.js`):
   a large file went straight into the model context, and Drive ran
   `String(data)` on binary files (garbage). Fixed: `MAX_CONTENT_CHARS =
   50000` — longer content is truncated with `truncated: true`; binary
   content (a Buffer containing a 0x00 byte) throws a clear "not readable as
   text" error instead of returning garbage.
4. **AI SDK bridge** (`backend/src/agent/toolAdapter.js`): bridges the catalog
   to Vercel AI SDK tools. Derives safe tool ids (`gmail_send_email` — no
   spaces, only lowercase letters/digits/underscore); caps results at 50,000
   chars; returns errors as data (`{ error: ... }`) so the model can recover
   instead of throwing; and a `confirm` hook gates write tools (send/create/
   update/append) behind user approval. The catalog's display names are
   unchanged — the adapter derives the safe ids.
5. **getAuth drift test**: the `getAuth` block is duplicated in the 16 Google
   tool files (deliberate, so files copy verbatim). A test in e2e-tools.js
   extracts the block from every Google file, normalizes the toolkit prefix,
   and asserts all 16 are identical, so the copies cannot drift apart.

**Generated agents need Node >= 22.12.** `require('octokit')` works on
Node >= 22.12 (verified on Node v24.22.1); older Node may fail because recent
octokit releases are ESM-only. The generated agent's Dockerfile must use
Node >= 22.12.

**Telegram webhook caveat.** `telegram/read-messages.js` uses polling
(`getUpdates`). Do NOT set a webhook on that bot — a webhook makes
`getUpdates` fail with a 409 conflict. A webhook-based Telegram receiver is
a Phase 2 runtime consideration, not an LLM tool.

**Google OAuth verification note.** Gmail scopes are restricted/sensitive.
Serving external customers may require Google's app verification and possibly
a security assessment. Check Google's current requirements before promising
Gmail to customers. (Product note, not a code issue.)

## Count

35 toolkits, 88 tools — the original 10 toolkits / 29 tools plus the
2026-11-27 expansion batch (25 toolkits, 59 tools).
HubSpot was removed on 2026-11-25 (replaced by Google Sheets for leads) and
re-added on 2026-11-27 at the user's word — both statements stay in this doc
as the decision record.
Auth: each service needs its own free developer account (Google Cloud project,
Slack app, GitHub OAuth app, Meta/WhatsApp Business, Telegram bot, MongoDB
Atlas cluster, Discord app, Microsoft app registration, Notion integration,
Airtable token, mail server, MySQL/PostgreSQL server, OpenAI / Anthropic /
Google AI / Hugging Face keys, local Ollama, HubSpot private app, Salesforce
connected app, Pipedrive token, Trello power-up key, Jira API token, Stripe
key, Shopify custom app, WooCommerce keys). Keys live in Nexora's own secrets
store (Phase 2), on our server.
