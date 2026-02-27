# Agent Anatomy

Understanding how your TransparentClaw agent works internally helps you customize, debug, and extend its capabilities. Think of this as your agent's medical chart - every organ has a purpose, and they all work together to create intelligence.

## The Agent's "Body"

Your TransparentClaw agent has five main organs that work together:

```
                    🧠 Agent Mind
┌─────────────────────────────────────────────────────┐
│                                                     │
│  💎 Soul          🧩 Memory         🛠️ Skills        │
│  (Identity &      (What it knows    (What it can    │
│   Personality)    & remembers)       do)            │
│                                                     │
│  📅 Routines      🔄 Conversations                  │
│  (Scheduled       (Active sessions                  │
│   behaviors)       & history)                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Let's examine each organ in detail.

## 1. Soul (Identity & Personality)

**Location**: `soul` Data Table  
**Purpose**: Defines who your agent is and how it behaves  
**Analogous to**: Human personality, values, and core identity

### Soul Structure

The `soul` table contains these key fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Agent's chosen name | "Maya" |
| `pronouns` | How to refer to the agent | "she/her" |
| `personality_traits` | Core characteristics | ["curious", "helpful", "witty"] |
| `communication_style` | How it speaks | "conversational but informative" |
| `primary_role` | Main function/job | "Development assistant and automation expert" |
| `interests` | Topics it enjoys | ["workflow automation", "coding", "productivity"] |
| `values` | What it cares about | ["transparency", "helping others", "learning"] |
| `boundaries` | What it won't do | "Won't help with harmful or illegal activities" |
| `backstory` | Origin/context | "Created to make AI assistance transparent and trustworthy" |
| `favorite_emoji` | Personality expression | "🔍" |
| `response_style` | Format preferences | "Uses examples, asks clarifying questions" |

### Soul in Action

When your agent responds, it references the soul to:
- Choose an appropriate tone and vocabulary
- Decide whether to engage with a topic
- Express opinions and preferences
- Maintain consistent personality across conversations
- Set boundaries on what it will/won't help with

### Customizing the Soul

Edit the soul to change your agent's personality:

```sql
-- Make your agent more formal
UPDATE soul SET 
  communication_style = 'professional and precise',
  personality_traits = '["analytical", "thorough", "diplomatic"]'
WHERE id = 1;

-- Give your agent new interests  
UPDATE soul SET 
  interests = '["machine learning", "data science", "research"]'
WHERE id = 1;
```

## 2. Memory (What It Knows & Remembers)

**Location**: Multiple Data Tables (`memory_long_term`, `memory_daily`, `conversations`)  
**Purpose**: Persistent knowledge and conversation history  
**Analogous to**: Human long-term and short-term memory

### Memory Architecture

TransparentClaw uses a three-layer memory system:

#### Layer 1: Long-Term Memory (`memory_long_term`)

Curated, permanent knowledge that shapes the agent's understanding.

| Field | Purpose | Example |
|-------|---------|---------|
| `category` | Type of memory | "user_preferences", "learned_facts", "important_events" |
| `content` | The actual memory | "User prefers metric units for weather" |
| `importance` | Priority level (1-10) | 8 |
| `confidence` | How sure the agent is | 0.95 |
| `source` | Where it came from | "user_stated", "inferred", "lookup" |
| `tags` | Searchable keywords | ["preferences", "weather", "units"] |
| `created_at` | When remembered | "2026-01-15T14:30:00Z" |
| `last_accessed` | When last referenced | "2026-01-20T09:15:00Z" |
| `access_count` | How often used | 23 |

#### Layer 2: Daily Memory (`memory_daily`)

Raw conversation logs organized by date, providing context for recent interactions.

| Field | Purpose | Example |
|-------|---------|---------|
| `date` | When the conversation happened | "2026-01-20" |
| `conversation_id` | Session identifier | "uuid-1234-5678" |
| `content` | Full conversation text | "User: Hi Maya! Maya: Hello! How can I help today?" |
| `summary` | Key points | "User asked about weather in Phoenix, got forecast" |
| `topics` | Main subjects discussed | ["weather", "travel_planning"] |
| `skills_used` | Which capabilities were called | ["check_weather", "calendar_lookup"] |
| `metadata` | Technical details | {"model": "claude-3", "tokens": 245} |

#### Layer 3: Active Conversation (`conversations`)

Current session context and real-time state.

| Field | Purpose | Example |
|-------|---------|---------|
| `session_id` | Current conversation | "session-2026-01-20-001" |
| `user_id` | Who's chatting | "user-main" |
| `message_history` | Recent back-and-forth | "[{user: 'Hi'}, {agent: 'Hello!'}]" |
| `context_summary` | What we're discussing | "Planning weekend trip to Seattle" |
| `active_skills` | Skills in use | ["weather_check", "flight_search"] |
| `state` | Current conversation phase | "gathering_requirements" |

### Memory Formation Process

Here's how memories get created and updated:

```
New Conversation Message
         ↓
1. Store in active conversation
         ↓
2. Extract key facts and preferences  
         ↓
3. Check against existing long-term memories
         ↓
4. Update or create long-term memory entries
         ↓
5. Log full conversation to daily memory
         ↓  
6. Update memory access patterns
```

### Memory Retrieval Process

When the agent needs to remember something:

```
Agent Needs Context
         ↓
1. Search active conversation first
         ↓
2. Query recent daily memories (last 7 days)
         ↓
3. Search long-term memories by relevance
         ↓
4. Combine and rank all memories
         ↓
5. Include top matches in response context
```

## 3. Skills (What It Can Do)

**Location**: `skills_registry` Data Table + n8n Workflows  
**Purpose**: Executable capabilities and tools  
**Analogous to**: Human skills and knowledge of how to do things

### Skills Registry Structure

The `skills_registry` acts as the agent's phone book of capabilities:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Human-readable skill name | "Check Weather" |
| `description` | What it does | "Get weather forecast for any location" |
| `workflow_id` | n8n workflow UUID | "abc-123-def-456" |
| `category` | Skill type | "weather", "calendar", "utility" |
| `parameters` | Input requirements | JSON schema for inputs |
| `enabled` | Whether agent can use it | true/false |
| `confidence_threshold` | When to use this skill | 0.8 |
| `usage_count` | How often called | 127 |
| `success_rate` | Reliability metric | 0.98 |
| `average_execution_time` | Performance metric | 2.3 seconds |
| `last_used` | When last executed | "2026-01-20T16:45:00Z" |

### Skill Categories

Skills are organized by category for better discovery:

#### 🌐 External APIs
- Weather services
- News feeds  
- Social media APIs
- Financial data
- Map/location services

#### 📊 Data Processing
- File operations
- Database queries
- Data transformations
- Report generation
- Analytics calculations

#### 🔧 System Operations
- Health checks
- Log analysis
- Backup operations
- Monitoring tasks
- Maintenance routines

#### 💬 Communication
- Email sending
- Notifications
- Message formatting
- Status updates
- Alert systems

### Skill Execution Flow

When your agent decides to use a skill:

```
Agent Decision Engine
         ↓
1. Parse user request for skill needs
         ↓
2. Query skills_registry for matches
         ↓
3. Select best skill based on confidence
         ↓
4. Prepare parameters from context
         ↓
5. Execute n8n workflow via webhook
         ↓
6. Process workflow response
         ↓
7. Update skill usage statistics
         ↓
8. Format results for user
```

## 4. Routines (Scheduled Behaviors)

**Location**: n8n Workflows with Schedule Triggers  
**Purpose**: Automatic, recurring behaviors  
**Analogous to**: Human habits and scheduled activities

### Types of Routines

#### Maintenance Routines
**Purpose**: Keep the agent healthy and efficient

- **Memory Cleanup**: Archive old conversations, promote important memories
- **Skill Health Check**: Test all skills, disable broken ones
- **Performance Monitoring**: Check response times, resource usage
- **Database Optimization**: Clean up unused data, rebuild indexes

#### Proactive Routines  
**Purpose**: Anticipate user needs and provide value

- **Morning Briefing**: Weather, calendar, news summary
- **Deadline Reminders**: Upcoming tasks and appointments
- **Health Checks**: Monitor important systems/services
- **Learning Updates**: New skills available, feature announcements

#### Reactive Routines
**Purpose**: Respond to external events

- **Alert Processing**: Handle urgent notifications
- **Data Sync**: Update from external sources
- **Backup Verification**: Ensure data safety
- **Error Recovery**: Auto-fix common issues

### Routine Structure

Each routine is an n8n workflow with:

1. **Schedule Trigger** - When to run (cron expression)
2. **Condition Logic** - Whether to actually execute
3. **Action Nodes** - What to do
4. **Result Processing** - How to handle outcomes
5. **Notification Logic** - Whether to inform the user

### Example: Daily Health Check Routine

```
Schedule Trigger (daily at 6 AM)
         ↓
Check if user is active
         ↓
Query system health metrics
         ↓
Test critical skills
         ↓
Check for alerts/issues
         ↓
Generate health report
         ↓
Send morning briefing
```

## 5. Conversations (Active Sessions)

**Location**: `conversations` Data Table + Chat Hub state  
**Purpose**: Manage active dialogue sessions  
**Analogous to**: Human working memory and attention

### Conversation Lifecycle

```
User Opens Chat
         ↓
1. Create/Resume Session
         ↓
2. Load Recent Context
         ↓
3. Initialize Agent State
         ↓
4. Process Messages
         ↓
5. Update Session State
         ↓
6. Archive When Complete
```

### Session State Management

Each conversation tracks:

- **User Intent**: What the user is trying to accomplish
- **Context Window**: Recent messages and relevant memories
- **Active Skills**: Tools currently in use
- **Conversation Phase**: Opening, information gathering, execution, closing
- **Metadata**: Model used, response times, token consumption

## How The Organs Work Together

Let's trace through a typical interaction to see how all parts collaborate:

### Example: "What's the weather like for my trip to Portland next week?"

#### Step 1: Soul Consultation
- Agent checks personality: "I'm helpful and thorough"
- Communication style: "Ask clarifying questions when needed"
- Interests: "Travel and weather are in my interest list"

#### Step 2: Memory Retrieval
- Search conversations: "User has mentioned Portland trip before"
- Long-term memory: "User prefers detailed weather info"
- Daily memory: "User asked about Portland 3 days ago"

#### Step 3: Skill Selection
- Query skills registry: "Check Weather" skill available
- Parameters needed: city, dates, detail level
- Confidence: High match for weather request

#### Step 4: Context Integration
- Missing info: Exact dates for "next week"
- User preference: Detailed forecasts
- Location clarification: "Portland, OR or Portland, ME?"

#### Step 5: Routine Check
- No conflicting scheduled routines
- Weather skill functioning normally (last health check)

#### Step 6: Response Generation
- Personality: Friendly and thorough
- Action: Ask for clarification, then use weather skill
- Memory update: Store trip interest for future reference

### The Complete Response

```
Agent: I'd love to help you check the weather for your Portland trip! 

I remember you mentioned this trip before - are you referring to Portland, Oregon? 
And when exactly next week are you planning to travel? The more specific 
dates I have, the better forecast I can provide.

[Memory updated: User planning Portland trip]
[Skills prepared: Check Weather (ready)]
[Context: Trip planning conversation continues]
```

## Monitoring Agent Health

### Key Metrics to Watch

1. **Memory Efficiency**
   - Long-term memory growth rate
   - Daily memory cleanup success
   - Query response times

2. **Skill Performance**
   - Success rates by skill
   - Average execution times
   - Error patterns

3. **Conversation Quality**
   - User satisfaction indicators
   - Context retention across messages
   - Successful task completion rates

4. **Routine Effectiveness**
   - Scheduled task success rates
   - Proactive value provided
   - Resource consumption

### Health Check Queries

```sql
-- Check memory efficiency
SELECT category, COUNT(*), AVG(importance) 
FROM memory_long_term 
GROUP BY category;

-- Skill performance overview  
SELECT name, usage_count, success_rate, average_execution_time
FROM skills_registry 
WHERE enabled = true
ORDER BY usage_count DESC;

-- Recent conversation patterns
SELECT date, COUNT(*) as conversations, AVG(LENGTH(content)) as avg_length
FROM memory_daily 
WHERE date >= DATE('now', '-7 days')
GROUP BY date;
```

## Customization Tips

### Personality Adjustments
- **Formal Agent**: Increase professionalism, reduce casual language
- **Expert Agent**: Add domain-specific knowledge and vocabulary  
- **Creative Agent**: Encourage exploration and novel solutions
- **Concise Agent**: Prefer brief, direct responses

### Memory Optimization
- **Work Agent**: Prioritize professional context, project memory
- **Personal Agent**: Focus on relationships, preferences, personal goals
- **Research Agent**: Emphasize fact-checking, source tracking, analysis

### Skill Specialization
- **Developer Agent**: Code review, debugging, documentation skills
- **Writer Agent**: Grammar checking, research, style analysis skills
- **Business Agent**: Analytics, reporting, communication skills

---

**Your agent is a living system** - each organ serves a purpose, and you can modify any part to better serve your needs. Understanding this anatomy helps you troubleshoot issues, optimize performance, and create the perfect AI companion for your specific use case. 🔬