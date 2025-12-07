# Chat MCP Tools Documentation

## Overview

This document describes the **11 MCP tools** added to support AI Chat functionality with strict task-only guardrails. 

**IMPORTANT: Chat message storage is handled DIRECTLY via REST API endpoints to Cosmos DB - NO AI involvement in data ingestion.**

---

## Architecture

### Components:
1. **MCP Server** (`mcp-server/src/index.ts`) - Exposes 21 total MCP tools
2. **Chat Agent Service** (`local-sql-bridge/chat-agent-service.js`) - AI agent with strict guardrails (ONLY generates responses, does NOT store messages)
3. **Local SQL Bridge** (`local-sql-bridge/server.js`) - REST API endpoints that directly store to Cosmos DB
4. **Mobile App** (`mobile/src/components/ChatBoxPage.tsx`) - React Native chat interface
5. **Cosmos DB** - Chat container with partition key `/chat`

### Data Flow:
```
Mobile App → POST /api/chat/message → Local SQL Bridge
                                            ↓
                              [DIRECT] Store user message to Cosmos DB (no AI)
                                            ↓
                              [DIRECT] Query chat history from Cosmos DB (no AI)
                                            ↓
                                     Chat Agent Service (AI)
                                     (only generates response)
                                            ↓
                              [DIRECT] Store assistant message to Cosmos DB (no AI)
                                            ↓
                              Return Response to Mobile
```

**Key Point: AI is ONLY used for generating intelligent responses. All Cosmos DB operations are direct REST API calls.**

---

## Chat Message Storage (Direct REST API - No AI)

### How Messages Are Stored:

1. **User sends message** → REST endpoint receives it
2. **Direct Cosmos DB write** → `chatContainer.items.create(userMessageDoc)`
3. **Direct Cosmos DB read** → `chatContainer.items.query(historyQuery)`
4. **AI generates response** → Uses conversation history for context
5. **Direct Cosmos DB write** → `chatContainer.items.create(assistantMessageDoc)`

### ⚠️ **store_chat_message & get_chat_history MCP Tools**

The `store_chat_message` and `get_chat_history` MCP tools exist in the MCP server but are **NOT used by the Chat Agent AI**. 

**Why?**
- REST endpoints handle ALL Cosmos DB chat message storage DIRECTLY
- NO AI involvement in data ingestion/retrieval for chat messages
- Faster, more reliable, and simpler architecture

**Where are these tools available?**
- MCP Server exposes them for future external integrations
- Can be used by other Azure AI Foundry Agents if needed
- Available for programmatic access outside the chat system

**For the NoAIUsed chat system:**
- ✅ REST API endpoints store messages directly: `chatContainer.items.create()`
- ✅ REST API endpoints fetch history directly: `chatContainer.items.query()`
- ❌ AI does NOT call store_chat_message
- ❌ AI does NOT call get_chat_history

---

## New MCP Tools (11 Tools)

### 1. Chat Context Management (2 Tools - NOT USED BY CHAT AGENT AI)

**⚠️ NOTE: These tools are exposed by MCP Server but NOT available to the Chat Agent. Use REST endpoints instead for direct Cosmos DB operations.**

#### **store_chat_message** (Available but not used)
Store chat messages for conversation history.

**Parameters:**
- `chat_id` (required): Chat session UUID
- `message` (required): Message content
- `role` (required): "user" or "assistant"
- `metadata` (optional): Additional data (task_ids, location, etc.)

**Returns:**
```json
{
  "success": true,
  "message_id": "uuid",
  "chat_id": "chat-uuid"
}
```

**Use Case:** Available for external integrations. **Chat system uses REST endpoints instead.**

---

#### **get_chat_history** (Available but not used)
Retrieve previous messages from a chat session.

**Parameters:**
- `chat_id` (required): Chat session UUID
- `limit` (optional): Max messages (default: 20)
- `include_metadata` (optional): Include metadata (default: true)

**Returns:**
```json
{
  "chat_id": "chat-uuid",
  "message_count": 15,
  "messages": [
    {
      "id": "msg-uuid",
      "message": "Show my pending tasks",
      "role": "user",
      "timestamp": "2025-12-07T10:30:00Z",
      "metadata": {}
    }
  ]
}
```

**Use Case:** Available for external integrations. **Chat system fetches history via REST endpoints before calling AI.**

---

### 2. Task Query Tools (5 Tools - USED BY CHAT AGENT AI)

**✅ These tools ARE available to the Chat Agent AI for intelligent task management responses.**

#### **get_all_tasks**
Get all tasks with comprehensive filtering.

**Parameters:**
- `status` (optional): "pending", "completed", "all" (default: all)
- `category` (optional): Task category filter
- `priority` (optional): Task priority filter
- `limit` (optional): Max tasks (default: 100)
- `include_deleted` (optional): Include soft-deleted (default: false)

**Example Queries:**
- "Show all my tasks"
- "List pending tasks"
- "What tasks do I have?"

---

#### **search_tasks**
Search tasks by keyword in title or description.

**Parameters:**
- `query` (required): Search keyword/phrase
- `status` (optional): Filter by status
- `limit` (optional): Max results (default: 20)

**Example Queries:**
- "Find grocery tasks"
- "Search for dentist"
- "Tasks mentioning John"

---

#### **get_completed_tasks**
Get completed tasks with date filtering.

**Parameters:**
- `date_range` (optional): "today", "yesterday", "this_week", "last_week", "this_month", "custom"
- `custom_start` (optional): Custom start date
- `custom_end` (optional): Custom end date
- `category` (optional): Filter by category
- `limit` (optional): Max tasks (default: 50)

**Example Queries:**
- "What did I complete today?"
- "Show finished tasks this week"
- "Completed shopping tasks"

---

#### **get_tasks_summary**
Get task statistics and summaries.

**Parameters:**
- `group_by` (optional): "status", "category", "priority", "date" (default: status)

**Returns:**
```json
{
  "group_by": "status",
  "totals": {
    "total": 45,
    "total_pending": 32,
    "total_completed": 13,
    "pending_high_priority": 4
  },
  "grouped_data": [
    { "status": "pending", "count": 32, "high_priority": 4 }
  ]
}
```

**Example Queries:**
- "How many tasks do I have?"
- "Task summary"
- "What's my workload?"

---

#### **get_tasks_by_date**
Get tasks filtered by date fields.

**Parameters:**
- `date_type` (optional): "due_date", "created_at", "completed_at" (default: due_date)
- `date_range` (required): "today", "tomorrow", "this_week", "next_week", "this_month", "overdue", "custom"
- `custom_start` (optional): Custom start date
- `custom_end` (optional): Custom end date
- `status` (optional): Filter by status (default: pending)

**Example Queries:**
- "What's due tomorrow?"
- "Tasks due this week"
- "Overdue tasks"

---

### 3. Task Bulk Operations (2 Tools)

#### **bulk_delete_tasks**
Delete multiple tasks at once.

**Parameters:**
- `task_ids` (optional): Specific task UUIDs
- `status` (optional): Delete by status
- `category` (optional): Delete by category
- `completed_before` (optional): Delete completed before date
- `require_confirmation` (optional): Dry run first (default: true)

**Two-Step Process:**
1. Set `require_confirmation=true` → Returns count and list
2. User confirms → Set `require_confirmation=false` → Executes deletion

**Example Queries:**
- "Delete all completed tasks"
- "Remove all shopping tasks"
- "Delete tasks completed last month"

---

#### **update_task_status**
Update status of multiple tasks.

**Parameters:**
- `task_ids` (required): Array of task UUIDs
- `new_status` (required): "pending" or "completed"

**Example Queries:**
- "Mark task X as complete"
- "Reopen task Y"
- "Complete these 3 tasks"

---

### 4. Chat Session Management (2 Tools)

#### **create_chat_session**
Create a new chat session.

**Parameters:**
- `user_id` (optional): User identifier
- `session_name` (optional): Session name
- `metadata` (optional): Additional metadata

**Returns:**
```json
{
  "success": true,
  "chat_id": "session-uuid",
  "session": { ... }
}
```

---

#### **get_recent_chat_sessions**
List recent chat sessions.

**Parameters:**
- `limit` (optional): Number of sessions (default: 10)
- `user_id` (optional): Filter by user

**Example Queries:**
- "Show my previous chats"
- "Resume last conversation"

---

## Strict Guardrails

### AI Chat Assistant Rules

The chat AI has **STRICT GUARDRAILS** and will **REFUSE** any request outside task management:

#### ✅ **ALLOWED Topics (Task Management Only):**
1. Creating tasks
2. Viewing/listing tasks
3. Editing tasks
4. Completing tasks
5. Deleting tasks
6. Searching tasks
7. Task statistics
8. Task filtering

#### ❌ **FORBIDDEN Topics (Politely Refused):**
- General conversation ("how are you?", "tell me a joke")
- General knowledge ("who is president?", "what is 2+2?")
- Technical support ("my phone is broken")
- Personal advice ("should I quit my job?")
- Creative requests ("write a poem")
- External information ("weather", "news", "sports")
- **Anything not directly related to task management**

### Example Responses

**Valid Request:**
```
User: "Show me all my pending tasks"
Assistant: [Calls get_all_tasks(status="pending")]
          "You have 15 pending tasks:
           1. Buy groceries (high priority)
           2. Call dentist (medium priority)
           ..."
```

**Off-Topic Request:**
```
User: "What's the weather like?"
Assistant: "I'm a task management assistant and can only help you with tasks. I can help you:
           - Create, view, edit, or delete tasks
           - Search and filter tasks
           - View task statistics and summaries
           - Mark tasks as complete
           
           Please ask me something about your tasks!"
```

---

## REST API Endpoints

### Mobile App Integration

#### **POST /api/chat/message**
Send a chat message and get AI response.

**Request:**
```json
{
  "chat_id": "chat-uuid",
  "message": "Show my pending tasks"
}
```

**Response:**
```json
{
  "success": true,
  "chat_id": "chat-uuid",
  "user_message_id": "msg-uuid-1",
  "assistant_message_id": "msg-uuid-2",
  "response": "You have 15 pending tasks...",
  "tool_calls": [...]
}
```

---

#### **GET /api/chat/:chat_id/history**
Get chat history.

**Query Params:**
- `limit` (optional): Max messages (default: 50)

---

#### **POST /api/chat/session**
Create new chat session.

**Request:**
```json
{
  "user_id": "mobile_user",
  "session_name": "Mobile Chat - Dec 7"
}
```

---

#### **GET /api/chat/sessions**
Get recent chat sessions.

**Query Params:**
- `limit` (optional): Max sessions (default: 10)
- `user_id` (optional): Filter by user

---

## Cosmos DB Schema

### Chat Container (Partition Key: `/chat`)

#### Message Document:
```json
{
  "id": "msg-uuid",
  "chat": "session-uuid",  // Partition key
  "message": "Show my tasks",
  "role": "user",  // or "assistant"
  "timestamp": "2025-12-07T10:30:00Z",
  "metadata": {
    "task_ids": ["task-uuid-1"],
    "tool_calls": 1
  }
}
```

#### Session Document:
```json
{
  "id": "session-uuid",
  "chat": "session-uuid",  // Partition key
  "type": "session",
  "user_id": "mobile_user",
  "session_name": "Task planning - Dec 7",
  "created_at": "2025-12-07T10:00:00Z",
  "last_message_at": "2025-12-07T11:30:00Z",
  "message_count": 15,
  "metadata": {}
}
```

---

## Usage Examples

### Example 1: User Asks About Tasks
```
User: "What tasks do I have today?"

Flow:
1. Mobile sends POST /api/chat/message
2. Server stores user message in Cosmos DB
3. Chat agent retrieves history (get_chat_history)
4. Chat agent calls get_tasks_by_date(date_range="today")
5. Agent generates response
6. Server stores assistant message in Cosmos DB
7. Response returned to mobile