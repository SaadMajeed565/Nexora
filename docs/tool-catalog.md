# Nexora Tool Catalog (self-hosted, manual)

Decision 2026-11-25: Composio is OUT. No third-party tool platform, no hosted
service, no API key to a tool vendor. Every tool is a small Node.js file in this
project that talks straight to the service's own API, using that service's
official library. All of it runs on our own server. Nango was checked and
rejected: its free self-hosted edition covers Auth + Proxy only — no tool calls.
Tool calls need Enterprise (paid) or Nango Cloud (their server).

Revision 2026-11-25 (user): only the mostly-used services. HubSpot is OUT —
user says it is not good. Leads live in Google Sheets instead. WhatsApp is IN.

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
(21 files), grouped in toolkit folders, e.g. backend/src/tools/gmail/ holds
search-emails.js, read-email.js, send-email.js. Each tool file exports one
tool and must be self-contained. The prebuilt agents' tools are catalog tools
too, so they get packaged the same way — e.g. the Customer Support agent uses
Gmail Read + Gmail Send + Order Lookup, so its generated project gets exactly
those three tool files, not the whole Gmail or Sheets set.

## Packaging into the generated agent

Every tool file in `backend/src/tools/` is self-contained and copyable: one
file per tool (21 files), grouped in toolkit folders, each only requiring its
own npm package (googleapis, @slack/web-api, octokit, node-telegram-bot-api),
zod, and Node built-ins (fetch for WhatsApp). No tool file requires any other
Nexora backend file or a sibling tool file. The Builder (Module 4) copies
ONLY the tool files that agent actually uses into the generated project
(`generated-agents/<agent-id>/tools/`), plus the npm packages those tools need
in that project's `package.json`, so the generated agent runs standalone in
its own Docker container with no dependency on the Nexora backend.

## Count

8 toolkits, 21 tools — all in one batch, no "next batch".
Removed: hubspot (list/create/update lead) — replaced by Google Sheets.
Auth: each service needs its own free developer account (Google Cloud project,
Slack app, GitHub OAuth app, Meta/WhatsApp Business, Telegram bot). Keys live
in Nexora's own secrets store (Phase 2), on our server.
