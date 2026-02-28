# Research Notes - External Tools & Ecosystem

## 1. OpenClaw Atom (AtomClaw) - by atom8n

**What:** A community fork of OpenClaw that adds Cursor Agent CLI support inside VS Code/Cursor/Antigravity.

**Key Insights:**
- Creator independently identified the same core value we did: OpenClaw's `.md` file structure (SOUL.md, AGENTS.md, HEARTBEAT.md, etc.) is the real innovation - it's a **programmable personality layer for AI agents**
- They forked OpenClaw and added Cursor support (`npm install -g openclaw-atom@latest`)
- Built a VS Code extension for visual management of OpenClaw's workspace files
- **Killer use case they found:** intelligent note-taking with conversational recall ("take a photo, extract info, ask for it later naturally")
- Replaced Playwright browser with browserOS MCP for safety
- **888 downloads** in ~1 week - real interest exists

**What this means for CrystalClaw:**
- Validates the thesis: the structured agent OS (.md files) is the durable value, not the model
- Shows demand for **visual management** of agent state (they built a whole VS Code extension for it)
- n8n's Data Tables + UI gives us a much better visual management layer than VS Code extensions
- The note-taking use case maps perfectly to our Memory Layer

---

## 2. n8n-as-code - by Etienne Lescot

**What:** Bidirectional n8n ↔ VS Code sync. Manage workflows as TypeScript files, version control with git, AI-assisted editing.

**Key Features:**
- `n8nac` CLI: list, fetch, pull, push, resolve (git-like workflow sync)
- TypeScript workflow definitions with decorators
- VS Code extension with embedded n8n canvas
- **AI Skills package** (`@n8n-as-code/skills`):
  - 1246+ documentation pages indexed for AI agents
  - Node schemas to prevent parameter hallucination
  - 7000+ community workflows searchable database
  - Claude Agent Skill for AI integration
- Multi-instance support
- Smart 3-way merge conflict resolution

**What this means for CrystalClaw:**
- **The skills package is gold** - we could use `@n8n-as-code/skills` to let our installer AI understand n8n node schemas and build workflows correctly
- TypeScript workflow definitions could be how we define agent skill templates (more readable than raw JSON)
- The sync engine patterns could inform how our Bridge syncs agent state ↔ Data Tables
- Shows the ecosystem is ready for "n8n as infrastructure" - people want to manage n8n programmatically

**Potential integration:**
- Use their skills package for AI-generated workflow creation during bootstrap
- Reference their node schema index when building tool descriptions for the agent
- Possibly collaborate - their CLI could be a power-user tool for CrystalClaw

---

## 3. PRD Summary (Angel's coworker conversation)

**Key reframes from the PRD:**

### Positioning shift
- NOT "a smarter AI" → n8n as the platform for **learning agents with visible logic**
- NOT "an AI assistant with workflows" → **an agent operating framework powered by workflows**

### The 4 problems we solve:
1. **Opaque behavior** - users can't see why the agent acted
2. **Fragmented memory** - ad hoc notes, hidden prompts, local files
3. **Weak operational visibility** - scheduled tasks buried in code
4. **Poor enterprise trust** - not auditable, too unconstrained

### Core components (mapped to our architecture):

| PRD Component | Our Implementation |
|---|---|
| Agent Identity Layer (SOUL.md) | `soul` Data Table + Agent system prompt |
| Agent Bootstrap Layer | Pre-loaded workflows + bootstrap script |
| Memory Layer (USER.md, HEARTBEAT.md) | `memory_long_term` + `memory_daily` Data Tables |
| Tools Layer (TOOLS.md) | `skills_registry` Data Table + n8n tool nodes |
| Agent Routine Layer | Visible Schedule Trigger workflows on canvas |
| Multi-Agent / Role Layer | Multiple Chat Hub agents with distinct configs |

### Key principles to embed:
- **Transparent by default** - everything inspectable
- **Model agnostic** - works with any LLM provider (Chat Hub already supports 14+)
- **Workflow-native** - visible orchestration, not hidden runtime
- **Enterprise-safe** - explicit tool permissions, auditable
- **Composable** - swap memory stores, tools, models without rebuilding

### MVP success criteria:
- Builders can create stateful agents without hidden prompt sprawl
- Operators can inspect and understand agent behavior
- Recurring routines are visible and manageable
- Teams trust it enough for internal production use

---

## Synthesis: How This Changes Our Architecture

### Before (v1 sketch):
- OpenClaw Gateway as separate container alongside n8n
- Bridge service syncing between two systems
- Two separate systems duct-taped together

### After (informed by PRD + research):
- **n8n IS the platform** - no separate OpenClaw Gateway needed for MVP
- Agent state lives entirely in Data Tables (no markdown files)
- Agent behavior lives entirely in workflows (no hidden runtime)
- Chat Hub is the interface
- The CLI installer is the deployment layer
- The "OpenClaw wrapper" is lighter than we thought - it's really just:
  1. The installer (one-command deploy)
  2. The pre-built workflow templates + Data Table schemas
  3. The bootstrap script that sets up the agent
  4. (Phase 2) The browser extension for desktop access

### The new architecture is simpler:
```
CrystalClaw = n8n + opinionated agent scaffolding
```

Not a fork. Not a wrapper. An **agent-first configuration of n8n** with:
- Pre-built Data Tables for agent state
- Pre-built workflows for agent behavior
- Chat Hub as the primary interface
- An AI-powered installer for one-command deployment
- A clear schema for how agent identity, memory, tools, and routines should be structured
