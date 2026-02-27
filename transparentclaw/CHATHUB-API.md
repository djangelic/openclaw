# Chat Hub API Reference (extracted from n8n source)

> Source: `packages/cli/src/modules/chat-hub/chat-hub.controller.ts`
> Types: `packages/@n8n/api-types/src/chat-hub.ts`
> Frontend: `packages/frontend/editor-ui/src/features/ai/chatHub/`

## Base URL
All endpoints: `{n8n-url}/api/v1/chat/...`

## Authentication
Uses n8n session auth. Requires `chatHub:message` scope.

---

## REST Endpoints

### Models
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/models` | Get available models (pass credentials map) |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/conversations?limit=N&cursor=UUID` | List conversations (paginated) |
| GET | `/chat/conversations/:sessionId` | Get conversation with all messages |
| PATCH | `/chat/conversations/:sessionId` | Update title, model, agent, tools |
| DELETE | `/chat/conversations/:sessionId` | Delete conversation |

### Messaging
| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/conversations/send` | Send message (returns immediately, streams via WebSocket) |
| POST | `/chat/conversations/:sessionId/messages/:messageId/edit` | Edit and re-stream |
| POST | `/chat/conversations/:sessionId/messages/:messageId/regenerate` | Retry message |
| POST | `/chat/conversations/:sessionId/messages/:messageId/stop` | Stop generation |
| POST | `/chat/conversations/:sessionId/reconnect?lastSequence=N` | Reconnect to active stream |

### Attachments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/conversations/:sessionId/messages/:messageId/attachments/:index` | Download attachment |

### Agents (Custom)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/agents` | List agents |
| GET | `/chat/agents/:agentId` | Get agent |
| POST | `/chat/agents` | Create agent |
| POST | `/chat/agents/:agentId` | Update agent |
| DELETE | `/chat/agents/:agentId` | Delete agent |

### Tools
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/tools` | List tools |
| POST | `/chat/tools` | Create tool |
| PATCH | `/chat/tools/:toolId` | Update tool |
| DELETE | `/chat/tools/:toolId` | Delete tool |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/settings` | Get all provider settings |
| GET | `/chat/settings/:provider` | Get single provider settings |
| POST | `/chat/settings` | Update provider settings |

---

## Key Data Structures

### SendMessageRequest
```typescript
{
  messageId: string;        // UUID - client generates
  sessionId: string;        // UUID - conversation ID
  message: string;          // User's text
  model: {                  // Which model to use
    provider: 'anthropic' | 'openai' | 'google' | 'n8n' | 'custom-agent' | ...;
    model?: string;         // e.g. "claude-sonnet-4-20250514"
    workflowId?: string;    // if provider is 'n8n'
    agentId?: string;       // if provider is 'custom-agent'
  };
  previousMessageId: string | null;  // For threading
  credentials: Record<string, { id: string; name: string }>;
  attachments: Array<{ data: string; mimeType: string; fileName: string }>;
  agentName?: string;
  timeZone?: string;
}
```

### CreateAgentRequest
```typescript
{
  name: string;             // 1-128 chars
  description?: string;     // max 512
  icon: { type: 'icon'|'emoji'; value: string };
  systemPrompt: string;     // The agent's personality/instructions
  credentialId: string;     // Which API key to use
  provider: 'anthropic' | 'openai' | ...;
  model: string;            // e.g. "claude-sonnet-4-20250514"
  toolIds: string[];        // UUIDs of attached tools
}
```

### Message DTO
```typescript
{
  id: string;
  sessionId: string;
  type: 'human' | 'ai' | 'system' | 'tool' | 'generic';
  name: string;
  content: Array<
    | { type: 'text'; content: string }
    | { type: 'hidden'; content: string }
    | { type: 'artifact-create'; content: string; command: {...} }
    | { type: 'with-buttons'; content: string; buttons: [...]; blockUserInput: boolean }
  >;
  provider: string | null;
  model: string | null;
  status: 'success' | 'error' | 'running' | 'cancelled' | 'waiting';
  previousMessageId: string | null;
  retryOfMessageId: string | null;
  revisionOfMessageId: string | null;
  attachments: Array<{ fileName?: string; mimeType?: string }>;
}
```

---

## WebSocket Streaming Protocol

Chat Hub uses n8n's **Push** system (WebSocket) for real-time streaming.

### Event Types (server → client):

| Event | Description |
|-------|-------------|
| `chatHubHumanMessageCreated` | User message was persisted |
| `chatHubMessageEdited` | Message was edited |
| `chatHubExecutionBegin` | Workflow execution started |
| `chatHubExecutionEnd` | Workflow execution finished (status included) |
| `chatHubStreamBegin` | AI response streaming started (includes messageId) |
| `chatHubStreamChunk` | Content chunk (sequenced, deduplicated) |
| `chatHubStreamEnd` | Streaming complete |
| `chatHubStreamError` | Streaming error |

### Stream Flow:
```
Client                          Server
  |                               |
  |--- POST /conversations/send ->|
  |<-- { status: 'streaming' } ---|
  |                               |
  |<-- WS: executionBegin --------|
  |<-- WS: humanMessageCreated ---|
  |<-- WS: streamBegin -----------|  (contains messageId, sequenceNumber)
  |<-- WS: streamChunk -----------|  (sequenceNumber=1, content="Hello")
  |<-- WS: streamChunk -----------|  (sequenceNumber=2, content=" world")
  |<-- WS: streamChunk -----------|  (sequenceNumber=3, content="!")
  |<-- WS: streamEnd -------------|  (status='success')
  |<-- WS: executionEnd ----------|
```

### Reconnection:
If WebSocket disconnects, client calls:
```
POST /conversations/:sessionId/reconnect?lastSequence=N
```
Returns pending chunks since sequence N.

---

## Providers Supported
- openai, anthropic, google, azureOpenAi, azureEntraId, ollama, awsBedrock
- vercelAiGateway, xAiGrok, groq, openRouter, deepSeek, cohere, mistralCloud
- **n8n** (workflow as agent — provider='n8n', workflowId='xxx')
- **custom-agent** (Chat Hub agents — provider='custom-agent', agentId='xxx')

---

## Key Insight for TransparentClaw

The `custom-agent` provider type is exactly what we need. We can:
1. Create a TransparentClaw agent via `POST /chat/agents` with our soul as systemPrompt
2. Attach tools (Data Table tool, workflow tools, etc.)
3. Users chat with it through Chat Hub
4. Responses stream back via WebSocket
5. The Bridge service can also call these APIs programmatically to inject context or trigger actions

The n8n provider type (`provider: 'n8n'`) lets us point to a specific workflow — so our "Main Agent" workflow IS the brain, and Chat Hub is the mouth.
