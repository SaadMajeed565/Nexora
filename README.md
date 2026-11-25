# Nexora — A Secure, Multi-Agent Prompt-to-Agent Platform

FYP, COMSATS University Islamabad, Vehari Campus.
Haider Raza (FA23-BSE-092) + Hamza Shoukat (FA23-BSE-081) — Supervisor: Dr. Muhammad Zahid Abbas.

The user describes an agent in plain language. Nexora turns it into a structured
blueprint (Gemini), matches it against a library of pre-built agents, generates a
runnable Node.js project, runs it in a Docker container, and offers a chat UI.

## Stack (locked)

- Frontend: React 18 + Vite + Tailwind CSS 3
- Backend: Node.js 22 + Express 5 + Mongoose (MongoDB Atlas)
- AI: Vercel AI SDK (`ai` + `@ai-sdk/google`) + Zod — Gemini is the model
- Tools: self-hosted catalog in `backend/src/tools/` — 8 toolkits, 21 tools, each using its service's official library (googleapis, @slack/web-api, octokit, node-telegram-bot-api, WhatsApp Cloud API via fetch). No third-party tool platform; everything runs on our own server.
- Runtime: Dockerode + BullMQ/Redis — one container per agent, own port, 512 MB limit
- Auth: JWT + bcryptjs — Secrets: AES-256 (Node `crypto`), env vars only
- Live updates: SSE (built in) — no Socket.IO

## Structure

```
nexora/
├── frontend/                  # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/             # Login, Register, Dashboard, PromptStudio,
│       │                      # BlueprintReview, AgentLibrary, AgentDetail,
│       │                      # Chat, BuildLogs, KnowledgeBase, Settings
│       ├── components/        # Navbar, AgentCard, MatchCard, ChatBox,
│       │                      # ExecutionGraph (@xyflow/react), CodeViewer (Monaco)
│       ├── services/          # api.js (axios + JWT)
│       └── context/           # AuthContext
├── backend/                   # Node 22 + Express 5
│   └── src/
│       ├── server.js          # entry point (+ /healthz)
│       ├── config/            # env, database, redis, gemini
│       ├── models/            # User, Workspace, Agent, Blueprint, Conversation,
│       │                      # BuildLog, AgentVersion, Secret, AuditLog, KnowledgeDocument
│       ├── routes/            # auth, workspace, blueprint, library, agent, chat, logs, admin
│       ├── controllers/       # one controller per route group
│       ├── middleware/        # JWT auth, RBAC, error handler
│       ├── services/
│       │   ├── blueprint.service.js   # Gemini -> JSON blueprint (generateObject + Zod)
│       │   ├── matching.service.js    # match % against library agents
│       │   ├── codegen.service.js     # Builder: generate agent project files
│       │   ├── pipeline/              # Planner, Builder, Tester, Auditor
│       │   ├── runtime.service.js     # Dockerode: ports, start/stop, health check
│       │   ├── chat.service.js        # session memory + Gemini replies (streamText)
│       │   ├── rag.service.js         # chunking, embeddings, Atlas Vector Search
│       │   ├── secrets.service.js     # AES-256 encrypt/decrypt
│       │   └── version.service.js     # versions + rollback
│       ├── tools/              # self-hosted tool catalog (8 toolkits, 21 tools)
│       │                       # each file is copyable into a generated agent
│       ├── jobs/              # BullMQ queues + build worker
│       ├── templates/
│       │   └── agent-template/        # template for generated agents
│       └── utils/             # logger, validators
├── generated-agents/          # output of Module 4 (gitignored)
├── docker/                    # Dockerfile + docker-compose (backend + redis)
└── docs/                      # SRS, SDD, API notes
```

Module map: 1 Auth+Dashboard, 2 Blueprint Engine, 3 Library+Matching,
4 Code Generation, 5 Assembly, 6 Runtime, 7 Chat+Memory/RAG, 8 Versions+Logs.

## Run it (local dev)

```bash
# 1. Install
cd frontend && npm install
cd ../backend && npm install

# 2. Environment
cp backend/.env.example backend/.env
# fill in MONGODB_URI, GEMINI_API_KEY, JWT_SECRET (and the tool credentials further down)

# 3. Redis (local, via Docker)
cd docker && docker compose up -d redis

# 4. Start
cd ../backend && npm run dev      # http://localhost:5000
cd ../frontend && npm run dev     # http://localhost:5173
```

## Evaluation 2 — the 40%

Module 1 Auth+Dashboard, Module 2 Prompt Studio+Blueprint, Module 3 Library+Matching,
Module 7 (partly) Chat with a ready-made agent. The remaining 60% (full build pipeline,
Docker runtime, versions/rollback, RAG, secrets, governance) comes after.
