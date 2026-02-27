# TransparentClaw Workflow Templates

This directory contains pre-built n8n workflow JSON files that are imported during the bootstrap process.

## Workflow Templates

### Core Workflows

- **`main-agent.json`** - The primary AI agent workflow that connects to Chat Hub
- **`memory-manager.json`** - Manages reading/writing to memory Data Tables
- **`heartbeat.json`** - Proactive schedule trigger for background tasks

### Skill Workflows

- **`skill-calendar.json`** - Calendar operations and scheduling
- **`skill-web-search.json`** - Web search and information retrieval  
- **`skill-notion.json`** - Notion database operations
- **`skill-file-manager.json`** - File system operations

## Workflow Structure

Each workflow JSON file should contain:

```json
{
  "name": "Workflow Name",
  "active": false,
  "nodes": [
    {
      "parameters": {},
      "id": "unique-node-id",
      "name": "Node Name",
      "type": "n8n-nodes-base.nodetype",
      "typeVersion": 1,
      "position": [x, y]
    }
  ],
  "connections": {},
  "createdAt": "2026-02-26T...",
  "updatedAt": "2026-02-26T...",
  "tags": ["transparentclaw", "skill"],
  "settings": {}
}
```

## Creating Custom Workflows

1. **Design in n8n**: Create your workflow in the n8n editor
2. **Export**: Use n8n's export functionality to get the JSON
3. **Add Tags**: Ensure the workflow has appropriate tags:
   - `transparentclaw` - Identifies it as a TransparentClaw workflow
   - `skill` - For skill-based workflows  
   - `core` - For essential system workflows
   - Custom tags for categorization
4. **Place in Templates**: Add the JSON file to this directory
5. **Update Bootstrap**: If needed, update the bootstrap process to import your new workflow

## Workflow Naming Convention

- **Core workflows**: `main-agent.json`, `memory-manager.json`, etc.
- **Skills**: `skill-[skill-name].json`
- **Integrations**: `integration-[service].json`
- **Utilities**: `util-[function].json`

## Data Table Integration

Workflows that interact with Data Tables should use:

- **Read operations**: Data Table node with "Read" operation
- **Write operations**: Data Table node with "Upsert" operation  
- **Consistent table names**: `soul`, `memory_long_term`, `memory_daily`, `skills_registry`, `user_profile`, `tool_config`, `conversations`

## Chat Hub Integration

Main agent workflows should:

1. **Start with Chat Trigger**: Use the Chat Trigger node
2. **End with Chat Response**: Use appropriate response nodes
3. **Show transparency**: Include status updates and execution visibility
4. **Handle errors gracefully**: Provide meaningful error messages to users

## Testing Workflows

Before adding workflows to templates:

1. **Test manually** in n8n editor
2. **Verify data table operations** work correctly
3. **Test error scenarios** and edge cases
4. **Ensure proper Chat Hub integration**
5. **Check performance** with realistic data volumes

## Workflow Dependencies

Some workflows may depend on:

- **External services**: API keys in `tool_config` table
- **Data Tables**: Specific table schemas must exist
- **Other workflows**: Sub-workflow calls
- **Environment variables**: Set in docker-compose.yml

Document dependencies in workflow descriptions and ensure they're handled in the bootstrap process.

## Notes for Developers

- **Placeholder workflows**: The bootstrap process creates minimal placeholder workflows if template files don't exist yet
- **Auto-import**: All JSON files in this directory are automatically imported during initialization
- **Workflow IDs**: Will be different after import - the system updates skill references automatically
- **Version compatibility**: Ensure node type versions are compatible with the n8n version being used

## TODO

- [ ] Create actual workflow JSON files (currently using placeholders)
- [ ] Test workflow import process with real n8n instance
- [ ] Add workflow validation before import
- [ ] Create workflow templates for common use cases
- [ ] Add documentation for custom node development