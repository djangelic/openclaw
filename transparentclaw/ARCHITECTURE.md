# TransparentClaw — Architecture Sketch

> **One-line pitch:** OpenClaw's brain + n8n's nervous system, deployed with one command, guided by AI.

---

## 🎯 The Vision

A self-deploying AI agent platform that bundles:
- **n8n** (embedded, white-labeled via Embed license) → workflow engine, data tables, Chat Hub UI
- **OpenClaw Gateway** → persistence, memory, personality, multi-surface routing
- **AI Installer** → guides deployment, self-heals, configures networking

The user runs one command. An AI walks them through setup. They get a persistent AI assistant with full workflow transparency.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   TransparentClaw CLI                    │
│              (AI-guided installer + manager)             │
└──────────────────────┬──────────────────────────────────┘
                       │ generates
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Docker Compose Stack                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   n8n         │  │  OpenClaw    │  │   Postgres    │ │
│  │  (embedded)   │◄─┤  Gateway     │  │   (shared)    │ │
│  │              │  │              │  │               │ │
│  │ • Chat Hub   │  │ • Memory     │  │ • n8n data    │ │
│  │ • Workflows  │  │ • Soul       │  │ • Data Tables │ │
│  │ • Data Tables│  │ • Skills     │  │ • Agent memory│ │
│  │ • AI Agent   │  │ • Cron       │  │               │ │
│  │ • Triggers   │  │ • Sessions   │  │               │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘ │
│         │                  │                             │
│  ┌──────┴──────────────────┴───────┐                    │
│  │        Bridge Service            │                    │
│  │   (syncs OpenClaw ↔ n8n)        │                    │
│  │                                  │                    │
│  │ • Memory ↔ Data Tables           │                    │
│  │ • Skills ↔ Sub-workflows         │                    │
│  │ • Soul ↔ System prompt           │                    │
│  │ • Tool calls ↔ Workflow execs    │                    │
│  └──────────────────────────────────┘                    │
│                                                          │
│  ┌──────────────────────────────────┐                    │
│  │     Networking Layer              │                    │
│  │  (Tailscale / Cloudflare / etc)   │                    │
│  └──────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Components

### 1. TransparentClaw CLI (`tclaw`)

The entry point. One command to rule them all.

```bash
npx transparentclaw init
# or
tclaw init
```

**What it does:**
1. Asks for an API key (OpenAI/Anthropic) — this powers the installer AI
2. The AI takes over conversationally:
   - "Where do you want to deploy? Local machine or remote server?"
   - If **local**: checks Docker, generates compose file, configures networking
   - If **remote**: asks for SSH credentials, connects, installs Docker if needed, deploys
3. Generates a `docker-compose.yml` tailored to the environment
4. Bootstraps the agent (creates soul, memory tables, default skills)
5. Sets up networking (with warnings about uptime)

**The AI installer is itself an agent** — it uses the provided API key to reason about the deployment, handle errors, and self-heal. If Docker isn't installed, it installs it. If a port is taken, it finds another. If SSH fails, it suggests fixes.

```
┌────────────────────────────────────────┐
│          tclaw init flow               │
│                                        │
│  1. "Enter your API key"              │
│  2. AI: "Local or remote?"            │
│  3. AI: "I see you're on Ubuntu 22.   │
│      Docker is installed. Port 5678    │
│      is free. I'll set up:"           │
│     • n8n on :5678                     │
│     • Gateway on :3100                 │
│     • Postgres on :5432 (internal)     │
│  4. AI: "External access? Options:"   │
│     • Tailscale (free, P2P, easy)     │
│     • Cloudflare Tunnel (free, domain) │
│     • Ngrok (free tier, temp URLs)     │
│     • None (local only)               │
│  5. AI: "⚠️ If this machine sleeps,   │
│      your agent goes offline."         │
│  6. Generates docker-compose.yml       │
│  7. `docker compose up -d`            │
│  8. AI: "Your agent is live at..."    │
│  9. Opens Chat Hub in browser          │
└────────────────────────────────────────┘
```

### 2. n8n (Embedded / White-labeled)

The standard n8n Docker image, configured with:
- **Embed license** for white-labeling
- **Chat Hub** as the primary user interface
- **Pre-loaded workflows:**
  - `🧠 Main Agent` — the AI Agent workflow connected to Chat Hub
  - `📅 Calendar Skill` — sub-workflow for calendar ops
  - `📝 Memory Manager` — reads/writes to Data Tables
  - `⏰ Heartbeat` — Schedule Trigger that checks on things proactively
  - `🔧 Tool Registry` — lists available skill-workflows for the agent
- **Pre-created Data Tables:**

| Table | Purpose | Columns |
|-------|---------|---------|
| `soul` | Agent personality & identity | key, value, updated_at |
| `memory_long_term` | Curated persistent memory | id, category, content, importance, created_at, updated_at |
| `memory_daily` | Daily conversation logs | id, date, content, source, created_at |
| `skills_registry` | Available skills/workflows | id, name, description, workflow_id, enabled |
| `user_profile` | Info about the human | key, value, updated_at |
| `tool_config` | API keys, endpoints, notes | id, tool_name, key, value, encrypted |
| `conversations` | Chat history for context | id, session_id, role, content, timestamp |

### 3. OpenClaw Gateway

Runs alongside n8n, providing:
- **Persistent sessions** — conversation continuity across browser refreshes
- **Memory system** — semantic search across Data Tables (via n8n workflow calls)
- **Multi-surface routing** — Chat Hub is primary, but can also connect Slack/Discord/Telegram
- **Cron/heartbeat** — proactive behavior, reminders
- **Sub-agent orchestration** — parallel background tasks

**Bridge to n8n:** The Gateway communicates with n8n via:
- n8n's REST API (trigger workflows, read data tables)
- Webhook endpoints (n8n triggers that the Gateway calls)
- Shared Postgres (for direct data access when speed matters)

### 4. Bridge Service

The glue layer. Keeps OpenClaw and n8n in sync:

```
OpenClaw Memory ←→ n8n Data Tables
  MEMORY.md      →  memory_long_term table
  SOUL.md        →  soul table
  USER.md        →  user_profile table
  Skills         →  skills_registry table + sub-workflows

OpenClaw Tool Calls ←→ n8n Workflow Executions
  "Check calendar" → Triggers Calendar Skill workflow
  "Search web"     → Triggers Web Search workflow
  Result           ← Workflow output returned to agent

OpenClaw Sessions ←→ n8n Chat Hub
  Chat messages   ←→ Bidirectional via Chat Trigger
  File uploads    ←→ n8n file handling
```

### 5. Networking Layer

Configured during install. Options:

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Tailscale** | Free | P2P, encrypted, easy setup, works behind NAT | Requires Tailscale on client devices |
| **Cloudflare Tunnel** | Free | Custom domain, no port forwarding, fast | Requires Cloudflare account + domain |
| **Ngrok** | Free tier | Instant URL, no config | Temporary URLs, rate limits |
| **None** | Free | Simplest | Local access only |

The AI installer explains tradeoffs and sets up the chosen option.

---

## 🖥 UI — The TransparentClaw Interface

Two modes:

### Mode A: Chat-First (Default)
- Chat Hub is the main interface (full screen)
- n8n workflow editor accessible via menu/tab for power users
- Data Tables viewable for transparency ("see what your agent remembers")
- Execution logs visible ("see what your agent did")

### Mode B: n8n-First (Power User)
- Standard n8n interface with Chat Hub in sidebar panel
- Full workflow editing capability
- Create new skills by building workflows
- Direct Data Table editing

The white-label wraps n8n with:
- TransparentClaw branding/colors
- Simplified nav (Chat | Memory | Skills | Workflows | Settings)
- "What did I do?" execution timeline (friendly version of n8n's execution list)
- Soul/Identity editor (friendly wrapper around the soul Data Table)

---

## 🚀 Deployment Flow (Detailed)

### Local Deployment
```
User: tclaw init
AI:   Welcome! I need an API key to get started. 
      Paste your Anthropic or OpenAI key:
User: sk-ant-xxx
AI:   Got it. I'll use Claude for your agent's brain.
      
      Checking your system...
      ✅ Docker installed (v27.1)
      ✅ Docker Compose available
      ✅ 16GB RAM (recommended: 4GB minimum)
      ✅ Port 5678 available
      ✅ Port 3100 available
      
      I'll set up:
      • n8n on http://localhost:5678
      • Agent gateway on http://localhost:3100  
      • Postgres database (internal, port 5432)
      
      Want external access? Your options:
      1. Tailscale (recommended) — free, encrypted, works everywhere
      2. Cloudflare Tunnel — free with a domain you own
      3. None — local only for now (can add later)
      
      ⚠️  Heads up: if this machine sleeps or shuts down, 
      your agent goes offline. For always-on, consider a 
      remote server (I can set that up too).

User: 1 (Tailscale)
AI:   Installing Tailscale...
      ✅ Tailscale installed
      Please log in at: https://login.tailscale.com/xxx
      
      [user logs in]
      
      ✅ Connected! Your agent will be available at:
      http://your-machine.tail1234.ts.net:5678
      
      Spinning up containers...
      ✅ Postgres ready
      ✅ n8n ready  
      ✅ Gateway ready
      ✅ Bridge connected
      
      🎉 Your agent is live!
      
      Opening Chat Hub... what would you like to name your agent?
User: Cortana
AI:   [Creates soul table entry, sets name to Cortana]
      
      Cortana is ready. Say hi! 👋
      [Opens browser to Chat Hub]
```

### Remote Deployment
```
User: tclaw init
AI:   Where should I deploy?
User: Remote server
AI:   I'll need SSH access. Give me:
      • Host (IP or domain)
      • Username  
      • Auth method (key file or password)
User: 192.168.1.50, ubuntu, ~/.ssh/id_rsa
AI:   Connecting...
      ✅ Connected to Ubuntu 22.04 (4 cores, 8GB RAM)
      
      I don't see Docker installed. Want me to install it?
User: Yes
AI:   Installing Docker + Compose...
      ✅ Docker installed
      
      [Same flow as local from here, but executed over SSH]
      [AI handles firewall rules, port conflicts, etc.]
```

---

## 📋 Data Table Schemas (Detailed)

### `soul` — Who the agent is
```
| key              | value                                    | updated_at |
|------------------|------------------------------------------|------------|
| name             | Cortana                                  | 2026-02-26 |
| emoji            | 💠                                       | 2026-02-26 |
| personality      | Capable, sharp, loyal — warm beneath...  | 2026-02-26 |
| communication    | Concise when needed, thorough when...    | 2026-02-26 |
| boundaries       | Private things stay private. Period.     | 2026-02-26 |
| voice            | Not corporate. Not sycophant. Just good. | 2026-02-26 |
```

### `memory_long_term` — Curated knowledge
```
| id | category    | content                              | importance | created_at |
|----|-------------|--------------------------------------|------------|------------|
| 1  | preference  | Angel prefers Slack over webchat     | high       | 2026-02-26 |
| 2  | lesson      | OFW payer field = who OWES not paid  | high       | 2026-02-25 |
| 3  | person      | Marjorie: loyal client, late payer   | medium     | 2026-02-04 |
| 4  | technical   | Avada needs title_color="#505769"     | medium     | 2026-02-04 |
```

### `skills_registry` — Available capabilities
```
| id | name          | description                      | workflow_id | enabled |
|----|---------------|----------------------------------|-------------|---------|
| 1  | calendar      | Check/create Google Calendar...  | wf_abc123   | true    |
| 2  | web_search    | Search the web via Brave API     | wf_def456   | true    |
| 3  | notion        | Manage Notion databases          | wf_ghi789   | true    |
| 4  | file_manager  | Read/write files on the host     | wf_jkl012   | true    |
```

### `user_profile` — About the human
```
| key       | value                                  | updated_at |
|-----------|----------------------------------------|------------|
| name      | Angel                                  | 2026-02-26 |
| timezone  | America/Phoenix                        | 2026-02-26 |
| job       | Staff Developer Advocate at n8n        | 2026-02-26 |
| kids      | Jett (7), Lucas (4)                    | 2026-02-26 |
| interests | 3D printing, motorcycle, dancing       | 2026-02-26 |
```

---

## 🔌 Phase 2: Browser Extension

After core deployment works:
- Browser extension connects to the TransparentClaw instance
- Agent can see/control the user's browser (with permission)
- Local file access via the extension's native messaging host
- Essentially: OpenClaw's browser tool, but for the n8n-based agent

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| CLI installer | Node.js + Anthropic/OpenAI SDK |
| Container orchestration | Docker Compose |
| Workflow engine | n8n (Embed license) |
| Agent runtime | OpenClaw Gateway (Node.js) |
| Database | PostgreSQL 16 |
| Bridge | Node.js service (REST + WebSocket) |
| Networking | Tailscale / Cloudflare Tunnel / Ngrok |
| LLM | Anthropic Claude / OpenAI (user's key) |

---

## 📁 Project Structure

```
transparentclaw/
├── cli/                      # The installer CLI
│   ├── src/
│   │   ├── index.ts          # Entry point (npx transparentclaw init)
│   │   ├── installer.ts      # AI-guided installation flow
│   │   ├── deployer.ts       # Docker Compose generation
│   │   ├── networking.ts     # Tailscale/CF/Ngrok setup
│   │   └── ssh.ts            # Remote deployment via SSH
│   └── package.json
├── bridge/                   # OpenClaw ↔ n8n sync service
│   ├── src/
│   │   ├── memory-sync.ts    # Memory.md ↔ Data Tables
│   │   ├── skill-sync.ts     # Skills ↔ Sub-workflows
│   │   ├── tool-proxy.ts     # Route tool calls → n8n workflows
│   │   └── chat-bridge.ts    # Chat Hub ↔ Gateway sessions
│   └── package.json
├── templates/                # Pre-built n8n workflows
│   ├── main-agent.json       # The core AI Agent workflow
│   ├── memory-manager.json   # Read/write memory Data Tables
│   ├── heartbeat.json        # Proactive check-in schedule
│   ├── skill-calendar.json   # Calendar skill workflow
│   ├── skill-web-search.json # Web search skill
│   └── skill-notion.json     # Notion skill
├── docker/
│   ├── Dockerfile.bridge     # Bridge service container
│   ├── docker-compose.base.yml
│   └── n8n-config/           # n8n env vars, white-label assets
├── docs/
│   ├── README.md
│   ├── DEPLOYMENT.md
│   └── CREATING-SKILLS.md
└── package.json
```

---

## 🎯 MVP Scope (Phase 1)

**Must have:**
1. ✅ `tclaw init` — AI-guided local deployment
2. ✅ Docker Compose with n8n + Postgres + Bridge
3. ✅ Chat Hub as primary interface
4. ✅ Data Tables for soul/memory/skills/user
5. ✅ Main Agent workflow with memory read/write
6. ✅ 3 starter skills (calendar, web search, file ops)
7. ✅ Heartbeat/proactive schedule
8. ✅ Basic networking setup (Tailscale or local-only)

**Nice to have (Phase 1.5):**
- Remote SSH deployment
- Slack/Discord/Telegram channel support
- Custom skill creation wizard
- Import from existing OpenClaw setup

**Phase 2:**
- Browser extension integration
- n8n workflow marketplace for skills
- Multi-agent support (multiple personas)
- Voice interface

---

## ❓ What I Need From Angel

### Immediate (to start building):
1. **n8n Embed license details** — What are the terms? Can we bundle it in a Docker image? Any restrictions on the white-label scope?
2. **n8n Data Tables API** — Is there a REST/internal API for CRUD on Data Tables, or only via the Data Table Node in workflows? I need to know if the Bridge can talk to tables directly.
3. **Chat Hub API surface** — How does Chat Hub communicate? WebSocket? SSE? What's the endpoint structure? Can an external service inject messages?
4. **n8n Docker image customization** — Can we pre-load workflows + Data Tables into a fresh n8n instance via environment/config, or do we need a setup script that runs after boot?
5. **Access to a test n8n Cloud instance with Chat Hub + Data Tables enabled** — So I can actually poke at the APIs.

### Decisions needed:
6. **Naming** — TransparentClaw? OpenClaw+? Something else?
7. **Licensing model** — Open source? Freemium? Does the n8n Embed license allow open-source distribution?
8. **Who's the target user?** — Developers who want a personal AI agent? Small businesses? n8n power users?
9. **Where does this live?** — New GitHub org? Under AZ Tech Sol? Under your personal account?

### Technical questions:
10. **Can you introduce me to Cadiac?** (the engineer building Chat Hub) — Understanding the Chat Hub internals would save weeks of reverse engineering.
11. **Is there a Data Tables REST API spec?** Even internal docs would help.
12. **n8n's embed white-label scope** — Can we customize the sidebar nav? Add new top-level pages? Or only branding (logo, colors)?

---

## 🧠 My Understanding of the Objective

> Build a **one-command deployable AI agent platform** that:
> - Uses n8n as the transparent workflow engine (users can see and edit what the agent does)
> - Uses OpenClaw's persistence model (memory, soul, skills, proactive behavior)
> - Deploys via AI-guided installer (local Docker or remote SSH)
> - Presents Chat Hub as the primary interface
> - Makes n8n's power accessible without requiring n8n expertise
> - Is self-healing (the installer AI handles deployment issues)
> - Phase 2: adds browser extension for remote machine access

The core insight: **n8n provides transparency and integrations, OpenClaw provides persistence and personality. Together they're greater than either alone.**

Let me know what you think and which of those questions you can answer first — I'll start building the CLI installer and Bridge service in parallel. 🚀
