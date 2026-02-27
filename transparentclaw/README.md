# TransparentClaw

> **AI agents with visible logic, structured memory, and workflow-native control**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)
[![n8n](https://img.shields.io/badge/Powered%20by-n8n-FF6D5A.svg)](https://n8n.io)
[![OpenClaw](https://img.shields.io/badge/Compatible%20with-OpenClaw-green.svg)](#)

## 🚀 30-Second Install

```bash
# One command deployment
npx transparentclaw init

# Follow the AI installer prompts - it will:
# 1. Ask for your API key (Anthropic/OpenAI)
# 2. Set up Docker Compose stack
# 3. Configure your agent's personality
# 4. Launch Chat Hub interface
```

Your transparent AI agent is ready in minutes, not hours.

## The Problem with Current AI Agents

🚫 **Opaque Black Boxes** - You can't see how they make decisions  
🧩 **Fragmented Memory** - Context gets lost between conversations  
🔒 **Vendor Lock-in** - Your data trapped in proprietary systems  
⚙️ **No Visibility** - Can't understand or modify agent behavior  
🔄 **No Persistence** - Start from scratch every session  

## The TransparentClaw Solution

```
┌─────────────────────────────────────────────┐
│               Chat Hub                       │
│        (Your conversation interface)         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│            Agent Brain                       │
│                                             │
│  📊 Data Tables     📋 Visible Workflows   │
│  (Structured        (Logic you can see     │
│   Memory)            and modify)           │
│                                            │
│  • Soul & Identity  • Tool execution      │
│  • Long-term memory • Skill registry      │
│  • Daily logs       • Automated routines  │
│  • User preferences • Custom behaviors    │
└─────────────────────────────────────────────┘
```

## ✨ Features

🔍 **Complete Transparency** - See every decision in visual workflows  
🧠 **Persistent Memory** - Structured data tables that never forget  
🎯 **Customizable Skills** - Build new capabilities via n8n workflows  
🔧 **Visual Logic** - Edit agent behavior on a drag-and-drop canvas  
📊 **Structured State** - Soul, memory, skills stored in queryable tables  
🌐 **Model Agnostic** - Works with 14+ LLM providers via Chat Hub  
🐳 **One-Command Deploy** - Docker Compose + AI installer handles everything  
🏠 **Data Ownership** - Your infrastructure, your data, your control  
🔒 **Privacy First** - Nothing leaves your infrastructure by default  
⚡ **Self-Healing** - AI installer troubleshoots and fixes issues  

## How It Works

### Data Tables = Agent Memory
Your agent's state lives in structured PostgreSQL tables that you can query and modify:

| Table | Purpose | Contents |
|-------|---------|----------|
| `soul` | Agent identity | Name, personality, communication style, rules |
| `memory_long_term` | Curated memories | Important facts, lessons learned, preferences |
| `memory_daily` | Raw conversation logs | Full chat history organized by date |
| `skills_registry` | Available tools | Workflow IDs, descriptions, parameters |
| `user_profile` | About you | Timezone, context, personal information |

### Workflows = Agent Behavior
Every action your agent takes runs through visible n8n workflows:

- **🧠 Conversation Flow** - How the agent processes your messages
- **🔧 Tool Execution** - How skills get called and results returned  
- **💭 Memory Management** - How new information gets stored
- **⏰ Scheduled Routines** - Automated tasks (weather checks, reminders)
- **🔍 Decision Logic** - The reasoning process made visible

You can see, understand, and modify every step.

## Comparison

| Feature | TransparentClaw | Raw ChatGPT | OpenClaw | LangChain |
|---------|----------------|-------------|----------|-----------|
| **Memory Persistence** | ✅ Structured tables | ❌ Session only | ✅ File-based | 🟡 Configurable |
| **Logic Visibility** | ✅ Visual workflows | ❌ Black box | 🟡 Code-based | 🟡 Code-based |
| **Easy Customization** | ✅ Drag & drop | ❌ None | 🟡 File editing | 🟡 Programming |
| **Data Ownership** | ✅ Your infrastructure | ❌ OpenAI servers | ✅ Local files | ✅ Your choice |
| **Model Flexibility** | ✅ 14+ providers | ❌ OpenAI only | ✅ Multiple | ✅ Multiple |
| **Deployment Ease** | ✅ One command | ✅ Just signup | 🟡 Manual setup | ❌ Complex setup |
| **Visual Interface** | ✅ Chat Hub + n8n | ✅ ChatGPT web | 🟡 Terminal/Slack | ❌ Code only |
| **Skills/Tools** | ✅ Workflow-based | 🟡 Built-in only | ✅ File-based | ✅ Programming |

## Screenshots

![Chat Interface](docs/images/chat-hub-interface.png)  
*Chat with your agent via n8n's Chat Hub*

![Workflow Editor](docs/images/workflow-canvas.png)  
*See and edit your agent's logic visually*

![Data Tables](docs/images/data-tables-view.png)  
*Query and modify your agent's memory directly*

![Skill Builder](docs/images/skill-workflow-builder.png)  
*Build new capabilities with drag-and-drop workflows*

## Quick Start Guide

1. **Install**: `npx transparentclaw init`
2. **Configure**: Follow the AI installer prompts
3. **Chat**: Open the Chat Hub URL provided
4. **Customize**: Edit workflows in n8n interface
5. **Extend**: Add skills via workflow builder

See [Getting Started Guide](docs/GETTING-STARTED.md) for detailed instructions.

## Documentation

📚 **[Getting Started](docs/GETTING-STARTED.md)** - Installation and first steps  
🛠️ **[Creating Skills](docs/CREATING-SKILLS.md)** - Build custom agent capabilities  
🧠 **[Agent Anatomy](docs/AGENT-ANATOMY.md)** - Understanding your agent's structure  
🔧 **[Architecture](ARCHITECTURE.md)** - Technical deep dive  
💬 **[Chat Hub API](CHATHUB-API.md)** - Integration reference  

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines  
- Pull request process
- Issue templates

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Built on the shoulders of giants:

- **[n8n](https://n8n.io)** - The incredible workflow automation platform that powers TransparentClaw
- **OpenClaw** - Architecture inspiration for transparent AI agents
- **Docker** - Making deployment simple and reproducible
- **PostgreSQL** - Reliable structured storage for agent memory

---

**Ready to see inside your AI agent?** 

```bash
npx transparentclaw init
```

*TransparentClaw - Where AI transparency meets workflow power*