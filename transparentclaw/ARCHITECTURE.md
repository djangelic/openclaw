# TransparentClaw — Architecture v2

> **One-line pitch:** n8n with opinionated agent scaffolding — just add workflows and watch your AI assistant come to life on the canvas.

---

## 🎯 The Vision

TransparentClaw is NOT a separate system alongside n8n. It's n8n configured as an agent operating framework.

The key insight: **Everything lives natively in n8n**
- **Data Tables** = agent state (soul, memory, tools, user profile)
- **Workflows** = agent behavior (visible on canvas)
- **Chat Hub** = the interface
- **Schedule Triggers** = routines (heartbeats, reflection)

No separate OpenClaw Gateway. No Bridge service. Just n8n + Postgres + installer CLI.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   TransparentClaw CLI                    │
│              (AI-guided installer + manager)             │
└──────────────────────┬──────────────────────────────────┘
                       │ generates docker-compose.yml
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Docker Compose Stack                    │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                     n8n                              │ │
│  │                                                     │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │                Chat Hub                         │ │ │
│  │ │          (primary interface)                    │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                     │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │               Data Tables                       │ │ │
│  │ │ • soul           • user_profile                 │ │ │
│  │ │ • memory_long_term • tool_config                │ │ │
│  │ │ • memory_daily   • skills_registry              │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                     │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │               Workflows                         │ │ │
│  │ │ • 🧠 Main Agent  • 📝 Memory Manager            │ │ │
│  │ │ • ⏰ Heartbeat   • 🔍 Web Search                │ │ │
│  │ │ • 📅 Calendar    • (custom skills...)           │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                   Postgres                           │ │
│  │  • n8n execution data                               │ │
│  │  • Data Tables storage                              │ │
│  │  • Agent memory                                     │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Docker Compose (Simple)

The deployment generates a minimal docker-compose.yml:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"  # Internal only
    
  n8n:
    image: n8nio/n8n:latest
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      N8N_USER_MANAGEMENT_DISABLED: true
      N8N_LOG_LEVEL: info
      WEBHOOK_URL: http://localhost:5678
      N8N_CHAT_ENABLED: true
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    command: /bin/sh -c "sleep 10 && n8n start"

volumes:
  postgres_data:
  n8n_data:
```

---

## 🗃 Data Table Schemas (Detailed)

### `soul` — Agent identity and personality
```sql
CREATE TABLE soul (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial values
INSERT INTO soul (key, value) VALUES
('name', 'Assistant'),
('emoji', '🤖'),
('personality', 'Helpful, curious, and transparent about what I can see and do'),
('communication_style', 'Clear and conversational, with technical depth when needed'),
('boundaries', 'I respect privacy and will only access what you give me permission to see'),
('voice', 'Direct but warm, not overly formal or corporate');
```

### `memory_long_term` — Curated persistent knowledge
```sql
CREATE TABLE memory_long_term (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  tags VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexed for semantic search
CREATE INDEX idx_memory_content ON memory_long_term USING gin(to_tsvector('english', content));
```

### `memory_daily` — Conversation logs and daily context
```sql
CREATE TABLE memory_daily (
  id SERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  session_id VARCHAR(255),
  content TEXT NOT NULL,
  source VARCHAR(100) DEFAULT 'chat', -- chat, workflow, heartbeat, etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned by date for performance
CREATE INDEX idx_memory_daily_date ON memory_daily(date);
CREATE INDEX idx_memory_daily_session ON memory_daily(session_id);
```

### `user_profile` — Information about the human user
```sql
CREATE TABLE user_profile (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(100) DEFAULT 'general', -- preferences, personal, work, etc.
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial scaffolding
INSERT INTO user_profile (key, value, category) VALUES
('timezone', 'UTC', 'preferences'),
('preferred_name', 'User', 'personal'),
('communication_preference', 'balanced', 'preferences'); -- concise, balanced, detailed
```

### `skills_registry` — Available agent capabilities
```sql
CREATE TABLE skills_registry (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  workflow_id VARCHAR(255), -- n8n workflow ID
  webhook_url VARCHAR(500),
  enabled BOOLEAN DEFAULT true,
  parameters JSONB, -- Expected input schema
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core skills
INSERT INTO skills_registry (name, description, parameters) VALUES
('web_search', 'Search the web using Brave API', '{"query": "string"}'),
('memory_write', 'Save information to long-term memory', '{"content": "string", "category": "string"}'),
('memory_read', 'Search through long-term memory', '{"query": "string"}'),
('get_time', 'Get current date and time', '{}');
```

### `tool_config` — API keys, endpoints, and configuration
```sql
CREATE TABLE tool_config (
  id SERIAL PRIMARY KEY,
  tool_name VARCHAR(255) NOT NULL,
  config_key VARCHAR(255) NOT NULL,
  config_value TEXT,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tool_name, config_key)
);

-- Example configurations
INSERT INTO tool_config (tool_name, config_key, config_value, description) VALUES
('brave_search', 'api_key', '', 'Brave Search API key for web searches'),
('anthropic', 'api_key', '', 'Anthropic API key for Claude models'),
('openai', 'api_key', '', 'OpenAI API key for GPT models');
```

---

## 🔄 Pre-built Workflows

### 1. Main Agent (main-agent.json)
The core AI workflow connected to Chat Hub:
- **Chat Trigger** → receives messages from Chat Hub
- **Context Builder** → reads soul, memory, user_profile from Data Tables
- **AI Agent Node** → processes conversation with full context
- **Memory Writer** → saves conversation summaries to memory_daily
- **Tool Dispatcher** → routes tool calls to skill workflows

### 2. Heartbeat (heartbeat.json)
Proactive check-in routine:
- **Schedule Trigger** → every 30 minutes
- **Activity Checker** → reads recent memory_daily entries
- **Decision Node** → IF something needs attention → trigger main agent
- **Notification** → posts proactive messages to Chat Hub

### 3. Memory Manager (memory-manager.json) 
Daily reflection and consolidation:
- **Schedule Trigger** → daily at 2:00 AM
- **Memory Reader** → gets last 7 days of memory_daily
- **AI Summarizer** → extracts key learnings and insights
- **Long-term Writer** → saves important items to memory_long_term
- **Cleanup** → removes old daily entries to manage storage

### 4. Web Search Skill (skill-web-search.json)
Callable web search capability:
- **Webhook Trigger** → callable by main agent
- **Brave API Call** → HTTP request to Brave Search
- **Result Formatter** → clean and structure results
- **Response** → return formatted results

---

## 🚀 CLI Installer Flow

```bash
npx transparentclaw init
```

**Step-by-step process:**

1. **API Key Collection**
   - Prompts for Anthropic/OpenAI API key
   - Validates key with test request
   - Stores securely for agent use

2. **Environment Detection** 
   - Checks Docker and Docker Compose installation
   - Scans for port availability (5678 for n8n, 5432 for Postgres)
   - Detects OS for networking setup

3. **Configuration Generation**
   - Generates docker-compose.yml with random passwords
   - Creates .env file with secure keys
   - Prepares bootstrap script

4. **Service Startup**
   - `docker compose up -d`
   - Health checks (waits for n8n to be ready)
   - Runs bootstrap script

5. **Agent Initialization**
   - Creates Data Tables with schemas
   - Imports workflow templates
   - Sets up Chat Hub agent
   - Seeds initial soul and user profile

6. **Access Setup**
   - Opens Chat Hub in browser
   - Displays access URLs
   - Shows next steps

---

## 🛠 Bootstrap Script Flow

The `templates/bootstrap.sh` script runs after n8n startup:

```bash
#!/bin/bash

# Wait for n8n health
echo "Waiting for n8n to be ready..."
while ! curl -f http://localhost:5678/healthz > /dev/null 2>&1; do
  sleep 5
done

# Create Data Tables
echo "Creating Data Tables..."
curl -X POST http://localhost:5678/api/v1/data/tables \
  -H "Content-Type: application/json" \
  -d @schemas/soul.json

# Import workflows
echo "Importing workflows..."
for workflow in templates/*.json; do
  curl -X POST http://localhost:5678/api/v1/workflows/import \
    -H "Content-Type: application/json" \
    -d @"$workflow"
done

# Create Chat Hub agent
echo "Setting up Chat Hub..."
curl -X POST http://localhost:5678/api/v1/chat/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistant",
    "workflowId": "main-agent",
    "enabled": true
  }'

echo "✅ TransparentClaw setup complete!"
echo "🌐 Access your agent at: http://localhost:5678/chat"
```

---

## 🌐 Phase 2: Browser Extension

Future enhancement that connects to the TransparentClaw instance:

- **Browser Extension** → connects to n8n Chat Hub
- **File Access** → via native messaging host  
- **Web Automation** → browser control workflows in n8n
- **Remote Access** → agent can see/interact with user's browser

This essentially brings OpenClaw's browser capabilities to the n8n-based agent.

---

## 🎯 Why This Architecture Works

### ✅ Advantages
- **Transparency** → All agent behavior visible on n8n canvas
- **Simplicity** → Just n8n + Postgres, no complex microservices  
- **Extensibility** → Users can create custom skills as workflows
- **Familiarity** → n8n's proven workflow engine
- **Cost-effective** → No separate agent runtime to maintain

### ⚠️ Considerations  
- **n8n dependency** → Tied to n8n's roadmap and capabilities
- **Chat Hub maturity** → Newer feature, may have limitations
- **Data Tables API** → Need comprehensive CRUD operations
- **Scalability** → Single n8n instance per agent (by design)

---

## 📁 Project Structure (Simplified)

```
transparentclaw/
├── cli/                      # The installer CLI
│   ├── src/
│   │   ├── index.ts          # Entry point (npx transparentclaw init)  
│   │   ├── installer.ts      # Interactive setup wizard
│   │   ├── docker.ts         # Docker Compose generation
│   │   └── bootstrap.ts      # n8n initialization
│   └── package.json
├── templates/                # Pre-built n8n workflows & schemas
│   ├── main-agent.json       # Core AI Agent workflow
│   ├── heartbeat.json        # Proactive check-in schedule
│   ├── memory-manager.json   # Daily reflection routine
│   ├── skill-web-search.json # Web search capability
│   ├── bootstrap.sh          # Setup script
│   └── schemas/              # Data Table definitions
│       ├── soul.sql
│       ├── memory_long_term.sql
│       ├── memory_daily.sql
│       ├── user_profile.sql
│       ├── skills_registry.sql
│       └── tool_config.sql
├── docs/
│   ├── README.md
│   ├── DEPLOYMENT.md
│   └── CUSTOM-SKILLS.md
└── package.json
```

---

## 🎯 MVP Scope (Phase 1)

**Core deliverables:**
1. ✅ CLI installer with Docker Compose generation
2. ✅ Data Table schemas for agent state
3. ✅ Main Agent workflow with Chat Hub integration  
4. ✅ Memory management workflows (daily + long-term)
5. ✅ Heartbeat/proactive behavior
6. ✅ Basic skill templates (web search, memory ops)
7. ✅ Bootstrap script for automated setup
8. ✅ Documentation for creating custom skills

**Success criteria:**
- One command deploys a working AI agent
- Agent remembers conversations across sessions
- Agent behavior is transparent (visible on canvas)
- Users can extend with custom workflows/skills
- Chat Hub provides intuitive interface

This simplified architecture removes complexity while maintaining all the power of transparent, workflow-based AI agents. The magic is in the configuration and templates, not the infrastructure.