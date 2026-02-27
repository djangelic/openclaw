#!/bin/bash

# TransparentClaw Bootstrap Script
# This script runs after n8n starts up to initialize the agent scaffolding

set -e  # Exit on any error

echo "🚀 Starting TransparentClaw bootstrap..."

# Configuration
N8N_URL="${N8N_URL:-http://localhost:5678}"
MAX_WAIT_TIME=300  # 5 minutes max wait
WAIT_INTERVAL=5    # Check every 5 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Wait for n8n to be healthy
log_info "Waiting for n8n to be ready at $N8N_URL..."
wait_time=0
while ! curl -f "$N8N_URL/healthz" > /dev/null 2>&1; do
    if [ $wait_time -ge $MAX_WAIT_TIME ]; then
        log_error "n8n failed to start within $MAX_WAIT_TIME seconds"
        exit 1
    fi
    log_info "n8n not ready yet, waiting... (${wait_time}s/${MAX_WAIT_TIME}s)"
    sleep $WAIT_INTERVAL
    wait_time=$((wait_time + WAIT_INTERVAL))
done

log_success "n8n is ready!"

# Function to check if a Data Table already exists
table_exists() {
    local table_name="$1"
    # Check if table exists by querying n8n's database API
    # This is a placeholder - actual implementation depends on n8n's Data Tables API
    response=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_URL/api/v1/data-tables/$table_name" || echo "000")
    [ "$response" = "200" ]
}

# Function to create a Data Table
create_data_table() {
    local table_name="$1"
    local table_schema="$2"
    
    if table_exists "$table_name"; then
        log_warning "Data Table '$table_name' already exists, skipping"
        return 0
    fi
    
    log_info "Creating Data Table: $table_name"
    
    # Create Data Table via n8n API
    # Note: This is a conceptual implementation - actual API may differ
    response=$(curl -s -w "%{http_code}" -X POST "$N8N_URL/api/v1/data-tables" \
        -H "Content-Type: application/json" \
        -d "$table_schema" || echo "000")
    
    if [[ "$response" == *"200"* ]] || [[ "$response" == *"201"* ]]; then
        log_success "Created Data Table: $table_name"
    else
        log_error "Failed to create Data Table: $table_name (Response: $response)"
        return 1
    fi
}

# Create Data Tables with schemas
log_info "Creating Data Tables..."

# Soul table - agent personality and identity
create_data_table "soul" '{
    "name": "soul",
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "key", "type": "string", "unique": true, "required": true},
        {"name": "value", "type": "string"},
        {"name": "updated_at", "type": "datetime", "default": "now"}
    ]
}'

# Memory long-term table - curated persistent knowledge
create_data_table "memory_long_term" '{
    "name": "memory_long_term", 
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "category", "type": "string"},
        {"name": "content", "type": "string", "required": true},
        {"name": "importance", "type": "number", "default": 1},
        {"name": "tags", "type": "string"},
        {"name": "created_at", "type": "datetime", "default": "now"},
        {"name": "updated_at", "type": "datetime", "default": "now"}
    ]
}'

# Memory daily table - conversation logs and daily context  
create_data_table "memory_daily" '{
    "name": "memory_daily",
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "date", "type": "date", "default": "today"},
        {"name": "session_id", "type": "string"},
        {"name": "content", "type": "string", "required": true},
        {"name": "source", "type": "string", "default": "chat"},
        {"name": "metadata", "type": "json"},
        {"name": "created_at", "type": "datetime", "default": "now"}
    ]
}'

# User profile table - information about the human user
create_data_table "user_profile" '{
    "name": "user_profile",
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "key", "type": "string", "unique": true, "required": true},
        {"name": "value", "type": "string"},
        {"name": "category", "type": "string", "default": "general"},
        {"name": "updated_at", "type": "datetime", "default": "now"}
    ]
}'

# Skills registry table - available agent capabilities
create_data_table "skills_registry" '{
    "name": "skills_registry",
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "name", "type": "string", "unique": true, "required": true},
        {"name": "description", "type": "string"},
        {"name": "workflow_id", "type": "string"},
        {"name": "webhook_url", "type": "string"},
        {"name": "enabled", "type": "boolean", "default": true},
        {"name": "parameters", "type": "json"},
        {"name": "created_at", "type": "datetime", "default": "now"},
        {"name": "updated_at", "type": "datetime", "default": "now"}
    ]
}'

# Tool config table - API keys, endpoints, and configuration
create_data_table "tool_config" '{
    "name": "tool_config", 
    "columns": [
        {"name": "id", "type": "number", "primary": true, "autoIncrement": true},
        {"name": "tool_name", "type": "string", "required": true},
        {"name": "config_key", "type": "string", "required": true},
        {"name": "config_value", "type": "string"},
        {"name": "encrypted", "type": "boolean", "default": false},
        {"name": "description", "type": "string"},
        {"name": "updated_at", "type": "datetime", "default": "now"}
    ],
    "unique": [["tool_name", "config_key"]]
}'

# Function to import a workflow
import_workflow() {
    local workflow_file="$1"
    local workflow_name=$(basename "$workflow_file" .json)
    
    if [ ! -f "$workflow_file" ]; then
        log_error "Workflow file not found: $workflow_file"
        return 1
    fi
    
    log_info "Importing workflow: $workflow_name"
    
    # Import workflow via n8n API
    response=$(curl -s -w "\\n%{http_code}" -X POST "$N8N_URL/api/v1/workflows/import" \
        -H "Content-Type: application/json" \
        -d @"$workflow_file" || echo -e "\\n000")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "201" ]]; then
        workflow_id=$(echo "$response_body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        log_success "Imported workflow: $workflow_name (ID: $workflow_id)"
        echo "$workflow_id"
    else
        log_error "Failed to import workflow: $workflow_name (HTTP: $http_code)"
        log_error "Response: $response_body"
        return 1
    fi
}

# Import workflow templates
log_info "Importing workflow templates..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workflow_ids=()

# Import main agent workflow
if main_agent_id=$(import_workflow "$SCRIPT_DIR/main-agent.json"); then
    workflow_ids+=("main-agent:$main_agent_id")
fi

# Import heartbeat workflow
if heartbeat_id=$(import_workflow "$SCRIPT_DIR/heartbeat.json"); then
    workflow_ids+=("heartbeat:$heartbeat_id")
fi

# Import memory manager workflow  
if memory_manager_id=$(import_workflow "$SCRIPT_DIR/memory-manager.json"); then
    workflow_ids+=("memory-manager:$memory_manager_id")
fi

# Import web search skill workflow
if web_search_id=$(import_workflow "$SCRIPT_DIR/skill-web-search.json"); then
    workflow_ids+=("web-search:$web_search_id")
fi

# Populate initial data
log_info "Seeding initial data..."

# Insert initial soul values
curl -s -X POST "$N8N_URL/api/v1/data-tables/soul/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "name",
        "value": "Assistant"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/soul/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "emoji", 
        "value": "🤖"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/soul/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "personality",
        "value": "Helpful, curious, and transparent about what I can see and do"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/soul/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "communication_style",
        "value": "Clear and conversational, with technical depth when needed"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/soul/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "boundaries",
        "value": "I respect privacy and will only access what you give me permission to see"
    }' > /dev/null

# Insert initial user profile
curl -s -X POST "$N8N_URL/api/v1/data-tables/user_profile/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "timezone",
        "value": "UTC",
        "category": "preferences"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/user_profile/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "preferred_name", 
        "value": "User",
        "category": "personal"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/user_profile/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "key": "communication_preference",
        "value": "balanced",
        "category": "preferences"
    }' > /dev/null

# Register core skills
for workflow_info in "${workflow_ids[@]}"; do
    workflow_name="${workflow_info%%:*}"
    workflow_id="${workflow_info##*:}"
    
    case "$workflow_name" in
        "web-search")
            curl -s -X POST "$N8N_URL/api/v1/data-tables/skills_registry/rows" \
                -H "Content-Type: application/json" \
                -d '{
                    "name": "web_search",
                    "description": "Search the web using Brave API",
                    "workflow_id": "'$workflow_id'",
                    "webhook_url": "'$N8N_URL'/webhook/web-search",
                    "enabled": true,
                    "parameters": {"query": "string", "count": "number"}
                }' > /dev/null
            ;;
    esac
done

# Insert initial tool configurations (placeholders)
curl -s -X POST "$N8N_URL/api/v1/data-tables/tool_config/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "tool_name": "brave_search",
        "config_key": "api_key", 
        "config_value": "",
        "description": "Brave Search API key for web searches"
    }' > /dev/null

curl -s -X POST "$N8N_URL/api/v1/data-tables/tool_config/rows" \
    -H "Content-Type: application/json" \
    -d '{
        "tool_name": "anthropic",
        "config_key": "api_key",
        "config_value": "",
        "description": "Anthropic API key for Claude models"
    }' > /dev/null

# Create Chat Hub agent (if Chat Hub API supports it)
log_info "Setting up Chat Hub agent..."
chat_agent_response=$(curl -s -w "%{http_code}" -X POST "$N8N_URL/api/v1/chat/agents" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Assistant",
        "description": "Your TransparentClaw AI assistant",
        "workflowId": "'$main_agent_id'",
        "enabled": true,
        "settings": {
            "model": "claude-3-sonnet",
            "temperature": 0.7,
            "maxTokens": 2000
        }
    }' 2>/dev/null || echo "000")

if [[ "$chat_agent_response" == *"200"* ]] || [[ "$chat_agent_response" == *"201"* ]]; then
    log_success "Chat Hub agent created successfully"
else
    log_warning "Could not create Chat Hub agent automatically - you may need to set it up manually"
fi

# Final setup message
log_success "🎉 TransparentClaw setup complete!"
echo
log_info "Summary:"
echo "  📊 Data Tables: soul, memory_long_term, memory_daily, user_profile, skills_registry, tool_config"
echo "  🔄 Workflows: $(echo "${workflow_ids[@]}" | wc -w) imported"
echo "  💬 Chat Hub: Ready at $N8N_URL/chat"
echo
log_info "Next steps:"
echo "  1. Open $N8N_URL/chat to start chatting with your agent"
echo "  2. Configure API keys in Data Tables > tool_config"
echo "  3. Customize your agent's personality in Data Tables > soul"  
echo "  4. View workflow execution on the n8n canvas"
echo
log_info "🌟 Your transparent AI assistant is ready to help!"