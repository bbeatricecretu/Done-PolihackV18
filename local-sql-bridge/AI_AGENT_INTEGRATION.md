# AI Agent Integration Guide

## Overview

This integration connects your local SQL bridge to Azure AI Foundry, allowing an AI agent to automatically process notifications and create tasks using the MCP server.

## Architecture

```
Mobile App → Local Bridge → CosmosDB
                               ↓
                         AI Agent (via REST API)
                               ↓
                         MCP Server Tools
                               ↓
                         Azure SQL Database
```

## Setup

### 1. Configure Azure AI Foundry Agent

Add these values to your `.env` file:

```env
# Your Azure AI Foundry endpoint
AZURE_AI_AGENT_ENDPOINT=https://your-resource.openai.azure.com

# Your API Key from Azure AI Foundry
AZURE_AI_AGENT_API_KEY=your_api_key_here

# Your deployment name (created in Azure AI Foundry)
AZURE_AI_AGENT_DEPLOYMENT_NAME=your_deployment_name
```

**How to get these values:**
1. Go to Azure AI Foundry Portal
2. Navigate to your project
3. Create or select a deployment
4. Copy the endpoint URL and API key
5. Note your deployment name

### 2. Optional: Enable Auto-Processing

To automatically process notifications every N minutes:

```env
AUTO_PROCESS_NOTIFICATIONS=true
AUTO_PROCESS_INTERVAL_MINUTES=5
```

## Usage

### Option 1: Manual Trigger (Recommended for testing)

Call the API endpoint to process notifications on demand:

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/process-notifications" -Method POST -ContentType "application/json" -Body '{"batchSize": 10}'

# cURL
curl -X POST http://localhost:3000/api/process-notifications \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "processed": 5,
    "response": "Processed 5 notifications. Created 3 tasks, ignored 2.",
    "tool_calls": [...],
    "success": true
  }
}
```

### Option 2: Automatic Processing

Set `AUTO_PROCESS_NOTIFICATIONS=true` in `.env` and the server will automatically:
- Check for new notifications every 5 minutes (configurable)
- Send them to the AI agent for analysis
- Create tasks via MCP server
- Clean up processed notifications

### Option 3: Check Notification Stats

View how many notifications are waiting:

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/notification-stats"

# Browser
http://localhost:3000/api/notification-stats
```

**Response:**
```json
{
  "total": 50,
  "unprocessed": 12,
  "processed": 38
}
```

## How It Works

1. **Mobile app sends notification** → Stored in CosmosDB with `processed: false`

2. **AI Agent is triggered** (manually or automatically)
   - Fetches up to 10 unprocessed notifications from CosmosDB
   - **Fetches recent context** - previous notifications from same app/author (last 24 hours)
   - Sends them to Azure AI Foundry with the system prompt
   
3. **AI Agent analyzes each notification WITH CONTEXT**
   - Checks if this notification is related to previous ones from same source
   - Determines action needed:
     * **CREATE** - New task (no previous context)
     * **EDIT** - Modify existing task (e.g., "Don't buy milk, buy eggs")
     * **DELETE** - Cancel task (e.g., "Meeting cancelled")
     * **COMPLETE** - Mark task done (e.g., "Package picked up")
     * **IGNORE** - Not task-worthy (spam, social media)
   - Calls appropriate MCP tools: `create_task_from_notification()`, `edit_task()`, `delete_task()`, `mark_task_complete()`
   
4. **MCP Server executes actions**
   - Tasks are created/edited/deleted in Azure SQL Database
   - Notifications are cleaned up from CosmosDB
   
5. **Mobile app syncs** → Sees new/updated/deleted tasks from AI agent

## System Prompt

The AI agent uses a sophisticated system prompt (see `ai-agent-service.js`) that:
- Teaches it to identify task-worthy notifications
- **Analyzes context from previous notifications from same source/author**
- **Detects task modifications** (e.g., "Don't buy milk, buy eggs")
- **Detects cancellations** (e.g., "Meeting cancelled")
- **Detects completions** (e.g., "Package picked up")
- Provides category classification rules (meetings, finance, shopping, etc.)
- Defines priority levels based on urgency
- Instructs it to clean up processed notifications

### Context-Aware Examples:

**Example 1: Task Modification**
```
Notification 1: "Buy milk" → Creates task "Buy milk"
Notification 2: "Don't buy milk, buy eggs instead" (with context)
  → Agent sees previous "buy milk" notification
  → Edits existing task to "Buy eggs"
```

**Example 2: Task Cancellation**
```
Notification 1: "Meeting at 3pm tomorrow" → Creates task
Notification 2: "Meeting cancelled" (with context)
  → Agent finds the meeting task
  → Deletes the task
```

**Example 3: Task Completion**
```
Notification 1: "Pick up package" → Creates task
Notification 2: "Package picked up" (with context)
  → Agent finds the task
  → Marks as completed
```

## Troubleshooting

### "Agent not configured" error
- Check that all 3 Azure AI variables are set in `.env`
- Verify the endpoint URL format: `https://your-resource.openai.azure.com`
- Ensure API key is valid

### "CosmosDB not configured" error
- Verify `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` are set
- Test connection: `http://localhost:3000/api/health`

### No notifications being processed
- Check notification stats: `http://localhost:3000/api/notification-stats`
- Verify mobile app is sending notifications correctly
- Check server logs for errors

### Tasks not appearing in mobile app
- Ensure mobile app is syncing with the bridge
- Check Azure SQL Database directly to see if tasks were created
- Verify the MCP server is properly configured with database credentials

## Testing the Integration

1. **Send a test notification from your mobile app**
   - Any notification should be stored in CosmosDB

2. **Check notification stats**
   ```bash
   curl http://localhost:3000/api/notification-stats
   ```

3. **Trigger AI processing manually**
   ```bash
   curl -X POST http://localhost:3000/api/process-notifications
   ```

4. **Check the logs** for AI agent responses

5. **Verify task creation** by checking:
   - Azure SQL Database
   - Mobile app (after sync)
   - `GET http://localhost:3000/api/tasks`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | POST | Receive notification from mobile app |
| `/api/process-notifications` | POST | Manually trigger AI processing |
| `/api/notification-stats` | GET | Get notification statistics |
| `/api/tasks` | GET | List all tasks |
| `/api/health` | GET | Health check |

## Next Steps

- Fine-tune the system prompt based on your notification patterns
- Adjust the auto-processing interval
- Add more sophisticated filtering logic
- Implement task deduplication
- Add notification priority scoring
