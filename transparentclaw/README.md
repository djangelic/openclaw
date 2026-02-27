# TransparentClaw 🔍

> **One-line pitch:** OpenClaw's brain + n8n's nervous system, deployed with one command, guided by AI.

A self-deploying AI agent platform that combines OpenClaw's memory and personality system with n8n's transparent workflow engine. Deploy your own AI assistant that shows you exactly how it works.

## 🚀 Quick Start

```bash
# Install and deploy in one command
npx transparentclaw init

# Or install globally
npm install -g transparentclaw
tclaw init
```

The AI installer will:
1. 🤖 Ask for your API key (Anthropic or OpenAI)
2. 🔍 Analyze your system (Docker, ports, resources)
3. 💬 Walk you through deployment options (local vs remote, networking)
4. 🐳 Generate and deploy Docker Compose stack
5. 🔧 Bootstrap your agent (memory, skills, workflows)
6. 🌐 Set up external access (Tailscale, Cloudflare, or Ngrok)
7. 🎉 Open Chat Hub in your browser

Your AI agent is ready in minutes, not hours.

## ✨ What You Get

- **🧠 Persistent AI Agent** - Remembers conversations, learns your preferences
- **🔍 Complete Transparency** - See and edit every workflow your agent uses
- **📊 Visual Interface** - n8n's Chat Hub for talking, workflow editor for tweaking
- **🔧 Extensible Skills** - Add new capabilities by building n8n workflows
- **💾 Data Ownership** - Your data stays on your infrastructure
- **🌐 External Access** - Reach your agent from anywhere (optional)
- **⚡ Self-Healing** - AI installer handles errors and configuration issues

## 🏗️ Architecture

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
└─────────────────────────────────────────────────────────┘
```

## 🔧 Commands

```bash
# Initialize new deployment
tclaw init

# Check service status
tclaw status

# Stop all services
tclaw stop

# Restart services
tclaw restart

# Update to latest version
tclaw update

# View logs
tclaw logs [service]

# Backup agent data
tclaw backup

# Migrate to different server
tclaw migrate
```

## 🌐 Networking Options

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Tailscale** | Free | P2P encrypted, works behind NAT | Requires Tailscale on client devices |
| **Cloudflare Tunnel** | Free | Custom domain, no port forwarding | Requires Cloudflare account + domain |
| **Ngrok** | Free tier | Instant URL, no config | Temporary URLs, rate limits |
| **Local Only** | Free | Simplest setup | No external access |

## 📊 Data Tables

Your agent uses structured data tables for transparency:

| Table | Purpose | Examples |
|-------|---------|----------|
| `soul` | Agent personality | name, emoji, communication style |
| `memory_long_term` | Curated memories | lessons learned, important facts |
| `memory_daily` | Conversation logs | raw chat history by date |
| `skills_registry` | Available capabilities | calendar, web search, file ops |
| `user_profile` | About you | timezone, preferences, context |
| `conversations` | Chat sessions | full conversation history |

## 🛠️ Creating Skills

Skills are n8n workflows that your agent can call:

1. **Build in n8n**: Create workflow with Webhook trigger
2. **Add to registry**: Register in skills Data Table  
3. **Tag properly**: Use `skill`, `transparentclaw` tags
4. **Test thoroughly**: Verify inputs/outputs work correctly

Example skill workflow:
```json
{
  "name": "🌐 Web Search Skill",
  "nodes": [
    { "type": "n8n-nodes-base.webhook", "name": "Webhook Trigger" },
    { "type": "n8n-nodes-base.httpRequest", "name": "Search API" },
    { "type": "n8n-nodes-base.code", "name": "Format Results" },
    { "type": "n8n-nodes-base.respondToWebhook", "name": "Return Results" }
  ]
}
```

## 🔒 Security & Privacy

- **Local First**: Your data never leaves your infrastructure by default
- **API Keys**: Stored securely in encrypted tool_config table
- **Network Security**: Optional external access with encryption (Tailscale/Cloudflare)
- **Container Security**: Non-root user, minimal attack surface
- **Data Ownership**: You own all data, models, and conversations

## 📚 Documentation

- **[Architecture](ARCHITECTURE.md)** - Detailed system design
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Manual deployment steps
- **[Creating Skills](docs/CREATING-SKILLS.md)** - Build custom capabilities
- **[API Reference](docs/API.md)** - Bridge service endpoints
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and fixes

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing patterns
4. **Test thoroughly**: Ensure compatibility with n8n + OpenClaw
5. **Submit PR**: Include description of changes and testing done

### Development Setup

```bash
# Clone repository
git clone https://github.com/[org]/transparentclaw.git
cd transparentclaw

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Test installation locally
npm run test:install
```

## 🐛 Known Issues

- **n8n Embed License**: Still finalizing commercial licensing terms
- **Data Tables API**: Using direct PostgreSQL access until n8n API is available
- **Chat Hub Integration**: WebSocket integration needs n8n internal API details
- **Workflow Templates**: Using placeholders until we have real n8n workflows

## 🗺️ Roadmap

### Phase 1 - MVP ✅
- [x] AI-guided installer CLI
- [x] Docker Compose generation
- [x] Basic bridge service
- [x] Data Tables integration
- [x] Skill registry system
- [x] Local deployment support

### Phase 1.5 - Polish
- [ ] Remote SSH deployment
- [ ] Real n8n workflow templates
- [ ] Chat Hub WebSocket integration  
- [ ] Error recovery and self-healing
- [ ] Comprehensive testing

### Phase 2 - Advanced
- [ ] Browser extension integration
- [ ] Multi-agent support
- [ ] Skill marketplace
- [ ] Voice interface
- [ ] Mobile app

## 🙋 Support

- **Documentation**: Check docs/ directory first
- **Issues**: Create GitHub issue with reproduction steps
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join the OpenClaw community server

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **n8n team** - For the incredible workflow platform
- **OpenClaw community** - For the agent architecture inspiration
- **Docker** - For making deployment simple
- **Anthropic & OpenAI** - For the AI that powers everything

---

**Built with ❤️ by the TransparentClaw team**

*One command. Full transparency. Your AI assistant.*