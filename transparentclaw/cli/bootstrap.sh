#!/bin/bash

# TransparentClaw Bootstrap Script
# This script runs once to set up n8n with workflows and agent configuration

set -e

echo "🚀 Starting TransparentClaw bootstrap..."

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to be ready..."
timeout=120
counter=0
while ! curl -s "${N8N_BASE_URL}/healthz" > /dev/null; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout waiting for n8n to start"
        exit 1
    fi
    echo "   Waiting for n8n... (${counter}/${timeout}s)"
    sleep 5
    counter=$((counter + 5))
done

echo "✅ n8n is ready"

# Basic n8n setup via API calls
echo "🔧 Setting up n8n configuration..."

# Create settings for Chat Hub
curl -X POST "${N8N_BASE_URL}/api/v1/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "chat.enabled",
    "value": true
  }' || echo "⚠️  Chat setting may already exist"

# Create settings for AI features
curl -X POST "${N8N_BASE_URL}/api/v1/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ai.enabled", 
    "value": true
  }' || echo "⚠️  AI setting may already exist"

# Set agent name
if [ ! -z "$AGENT_NAME" ]; then
    curl -X POST "${N8N_BASE_URL}/api/v1/settings" \
      -H "Content-Type: application/json" \
      -d "{
        \"key\": \"agent.name\",
        \"value\": \"$AGENT_NAME\"
      }" || echo "⚠️  Agent name setting may already exist"
fi

echo "📋 Creating basic workflows..."

# Create a simple Chat Hub workflow
cat > /tmp/chat_hub_workflow.json << 'EOF'
{
  "name": "TransparentClaw Chat Hub",
  "nodes": [
    {
      "parameters": {},
      "id": "chat-trigger",
      "name": "Chat Trigger",
      "type": "@n8n/n8n-nodes-base.chatTrigger",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "chat-hub"
    },
    {
      "parameters": {
        "options": {}
      },
      "id": "ai-agent",
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-base.aiAgent",
      "typeVersion": 1,
      "position": [460, 300]
    }
  ],
  "connections": {
    "Chat Trigger": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {},
  "tags": ["transparentclaw", "chat", "agent"]
}
EOF

# Import the chat workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/import" \
  -H "Content-Type: application/json" \
  -d @/tmp/chat_hub_workflow.json || echo "⚠️  Chat workflow may already exist"

echo "🎯 Creating basic Data Tables..."

# Create Memory Data Table
curl -X POST "${N8N_BASE_URL}/api/v1/data-tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Memory",
    "columns": [
      {"name": "id", "type": "string", "required": true, "unique": true},
      {"name": "timestamp", "type": "datetime", "required": true},
      {"name": "type", "type": "string", "required": true},
      {"name": "content", "type": "json", "required": true},
      {"name": "tags", "type": "string"}
    ]
  }' || echo "⚠️  Memory table may already exist"

# Create Skills Data Table  
curl -X POST "${N8N_BASE_URL}/api/v1/data-tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Skills",
    "columns": [
      {"name": "id", "type": "string", "required": true, "unique": true},
      {"name": "name", "type": "string", "required": true},
      {"name": "description", "type": "string", "required": true},
      {"name": "config", "type": "json", "required": true},
      {"name": "enabled", "type": "boolean", "required": true}
    ]
  }' || echo "⚠️  Skills table may already exist"

# Create Sessions Data Table
curl -X POST "${N8N_BASE_URL}/api/v1/data-tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Sessions", 
    "columns": [
      {"name": "session_id", "type": "string", "required": true, "unique": true},
      {"name": "created_at", "type": "datetime", "required": true},
      {"name": "updated_at", "type": "datetime", "required": true},
      {"name": "status", "type": "string", "required": true},
      {"name": "metadata", "type": "json"}
    ]
  }' || echo "⚠️  Sessions table may already exist"

echo "🌐 Setting up external access..."

# Configure webhook URLs if external URL is provided
if [ ! -z "$N8N_CHAT_PUBLIC_URL" ]; then
    echo "   Setting public URL: $N8N_CHAT_PUBLIC_URL"
    curl -X POST "${N8N_BASE_URL}/api/v1/settings" \
      -H "Content-Type: application/json" \
      -d "{
        \"key\": \"chat.publicUrl\",
        \"value\": \"$N8N_CHAT_PUBLIC_URL\"
      }" || echo "⚠️  Public URL setting may already exist"
fi

echo "✅ TransparentClaw bootstrap completed successfully!"
echo ""
echo "🎉 Your agent is ready!"
echo "   🌐 Access n8n: ${N8N_BASE_URL}"
echo "   💬 Chat Hub: ${N8N_BASE_URL}/chat"
echo "   📊 Data Tables: ${N8N_BASE_URL}/data"
echo ""
echo "Next steps:"
echo "1. Visit the n8n interface to explore your workflows"
echo "2. Configure your AI provider API keys in the workflows"
echo "3. Test the Chat Hub to interact with your agent"
echo ""
echo "Happy automating! 🤖"