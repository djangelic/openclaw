# Getting Started with TransparentClaw

Welcome to TransparentClaw! This guide will take you from zero to having a fully functional AI agent with visible logic and persistent memory.

## Prerequisites

Before you begin, make sure you have:

### Required
- **Docker** and **Docker Compose** installed
  ```bash
  # Verify installation
  docker --version
  docker-compose --version
  ```
- **Node.js** 18+ (for the installer)
  ```bash
  node --version  # Should be 18.0.0 or higher
  ```

### API Key (Choose One)
You'll need an API key from one of these providers:
- **Anthropic Claude** (recommended) - Get from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** - Get from [platform.openai.com](https://platform.openai.com)
- **Other providers** - See [supported models list](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/)

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB free space
- **Ports**: 5678 (n8n), 5432 (PostgreSQL) - installer will check for conflicts

## Installation

### Step 1: Run the AI Installer

The easiest way to get started:

```bash
npx transparentclaw init
```

Or install globally first:
```bash
npm install -g transparentclaw
tclaw init
```

### Step 2: Follow the AI Prompts

The AI installer will guide you through:

1. **API Key Setup**
   ```
   ? Which AI provider would you like to use?
   › Anthropic Claude (recommended)
     OpenAI GPT
     Other (advanced)
   
   ? Enter your API key: sk-ant-...
   ```

2. **System Analysis**
   ```
   🔍 Checking Docker installation... ✅
   🔍 Scanning for port conflicts... ✅
   🔍 Checking available memory... ✅ 8GB available
   ```

3. **Deployment Options**
   ```
   ? How would you like to deploy?
   › Local only (localhost access)
     Remote accessible (with tunneling)
     Custom network setup
   ```

4. **Agent Configuration**
   ```
   ? What should I call your agent? (default: "Assistant"): Maya
   ? Describe your agent's personality: Helpful and curious, with a dry sense of humor
   ? What timezone are you in? America/Phoenix
   ```

### Step 3: Launch Services

The installer will automatically:
- Generate Docker Compose configuration
- Pull required images (n8n, PostgreSQL)
- Create data volumes
- Initialize the database
- Start all services
- Set up your agent's initial configuration

You'll see output like:
```
🐳 Starting Docker services...
✅ PostgreSQL ready
✅ n8n started  
✅ Bridge service connected
✅ Agent initialized

🎉 TransparentClaw is ready!

Chat Interface: http://localhost:5678/chat
Workflow Editor: http://localhost:5678/workflows
```

## First Conversation with Your Agent

### Step 1: Open Chat Hub

Navigate to the Chat Interface URL (usually `http://localhost:5678/chat`)

You'll see a clean chat interface powered by n8n's Chat Hub.

### Step 2: Introduce Yourself

Start with a simple greeting:

```
You: Hi Maya! I'm excited to try out TransparentClaw.

Maya: Hello! I'm Maya, your new AI agent. I'm running on TransparentClaw, 
which means you can see exactly how I work under the hood. 

What makes me special is that I have persistent memory - I'll remember 
our conversations across sessions. I can also learn new skills through 
visual workflows that you can see and modify.

What would you like to explore first?
```

### Step 3: Test Memory

Ask your agent to remember something:

```
You: Please remember that I work as a software developer and I'm particularly interested in workflow automation.

Maya: I've added that information to my memory! You work as a software developer with a special interest in workflow automation. This context will help me provide more relevant suggestions and assistance.

Let me show you something cool - you can actually see this information being stored in real-time by checking the Data Tables in n8n.
```

### Step 4: View the Magic

Navigate to `http://localhost:5678` and login to n8n to see:

1. **Data Tables** - Your conversation is being stored in structured tables
2. **Active Workflows** - The conversation flow is running visibly
3. **Memory Updates** - Watch as new information gets categorized and stored

## Customizing Your Agent's Soul

Your agent's personality and behavior are defined in the `soul` Data Table. Here's how to customize it:

### Step 1: Access n8n Interface

1. Go to `http://localhost:5678`
2. Login (credentials provided during setup)
3. Navigate to **Data** → **Data Tables**
4. Click on the `soul` table

### Step 2: Edit Agent Properties

The soul table contains fields like:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Agent's name | "Maya" |
| `personality` | Core traits | "Helpful, curious, dry humor" |
| `communication_style` | How they talk | "Conversational but informative" |
| `primary_role` | Main function | "Development assistant and workflow expert" |
| `interests` | Topics they care about | ["automation", "coding", "productivity"] |
| `boundaries` | What they won't do | "Won't help with illegal activities" |

### Step 3: Test Changes

After modifying the soul:
1. Return to the Chat Hub
2. Start a new conversation
3. Notice how your agent's personality reflects the changes

## Adding Memory

TransparentClaw uses structured memory with three layers:

### Long-term Memory
Curated, important information that persists indefinitely.

**To add long-term memories:**
1. Go to n8n → Data Tables → `memory_long_term`
2. Click "Add Row"
3. Fill in:
   - `category`: "personal", "work", "preferences", etc.
   - `content`: The memory content
   - `importance`: 1-10 scale
   - `created_at`: Auto-filled
   - `last_accessed`: Auto-updated when referenced

### Daily Memory
Raw conversation logs organized by date.

**Automatic:** Every conversation gets logged to `memory_daily` with:
- Date stamp
- Full conversation context
- Metadata (model used, response time, etc.)

### Contextual Memory
Recent conversations that inform current responses.

**Configurable:** Edit the conversation workflow to adjust:
- How many previous messages to include
- How far back to look for relevant context
- Which memory categories to prioritize

## Creating Skills

Skills are n8n workflows that give your agent new capabilities. Let's create a simple one:

### Step 1: Create a New Workflow

1. In n8n, click **+ New Workflow**
2. Name it "🌟 My First Skill"
3. Add tags: `skill`, `transparentclaw`

### Step 2: Add Required Nodes

Every skill needs:

1. **Webhook Trigger**
   - Set HTTP Method: POST
   - Path: `/skill/my-first-skill`

2. **Your Logic** (example: get current time)
   - Add **Code** node
   - JavaScript: 
     ```javascript
     return {
       result: `The current time is ${new Date().toLocaleTimeString()}`,
       success: true
     };
     ```

3. **Response**
   - Add **Respond to Webhook** node
   - Connect from your logic node

### Step 3: Register the Skill

1. Go to Data Tables → `skills_registry`
2. Add new row:
   - `name`: "Get Current Time"
   - `description`: "Returns the current local time"
   - `workflow_id`: (copy from your workflow settings)
   - `parameters`: `[]` (empty for this simple skill)
   - `category`: "utility"

### Step 4: Test Your Skill

In Chat Hub, ask:
```
You: Can you tell me what time it is?

Maya: Let me check the current time for you.
[Executing: Get Current Time skill...]
The current time is 2:45:30 PM
```

See [Creating Skills](CREATING-SKILLS.md) for advanced skill development.

## Setting Up Routines

Routines are scheduled workflows that run automatically. Common examples:

### Morning Briefing Routine

1. Create new workflow: "🌅 Morning Briefing"
2. Add **Schedule Trigger**
   - Cron: `0 8 * * *` (8 AM daily)
3. Add logic to:
   - Check calendar for today's events
   - Get weather forecast
   - Summarize recent news
4. Add **Send Message** node to deliver briefing

### Memory Maintenance Routine

1. Create workflow: "🧠 Memory Cleanup"
2. Schedule weekly: `0 2 * * 1` (2 AM Mondays)
3. Add logic to:
   - Archive old daily memories
   - Promote important conversations to long-term
   - Clean up duplicate entries

### Health Check Routine

1. Create workflow: "🏥 System Health"
2. Schedule hourly: `0 * * * *`
3. Monitor:
   - Database connection
   - API key validity
   - Disk space usage
   - Memory consumption

## Next Steps

Now that you have TransparentClaw running:

1. **Explore the Interface** - Spend time in both Chat Hub and the n8n workflow editor
2. **Build Custom Skills** - Create workflows for your specific needs
3. **Customize Memory** - Tune how information gets stored and retrieved  
4. **Set Up External Access** - Configure tunneling for remote access
5. **Join the Community** - Share your workflows and learn from others

## Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker status
docker-compose ps

# View logs
docker-compose logs n8n
docker-compose logs postgres
```

**Can't access interfaces:**
- Check if ports 5678, 5432 are available
- Verify Docker containers are running
- Check firewall settings

**Agent not responding:**
- Verify API key is valid and has credits
- Check n8n workflow execution logs
- Ensure bridge service is connected

**Memory not persisting:**
- Confirm PostgreSQL is running
- Check Data Tables permissions
- Verify bridge service database connection

### Getting Help

- **Documentation**: Check other guides in `docs/`
- **Logs**: `docker-compose logs [service]`
- **Community**: GitHub Discussions
- **Issues**: Create detailed bug reports

Welcome to the world of transparent AI agents! 🎉