# Mobile Chat Integration

## Overview

The mobile app's **ChatBoxPage** is fully integrated with the backend REST API for AI-powered task management chat.

---

## Architecture

### Data Flow (Direct Cosmos DB Storage)

```
User Message → Mobile App → REST API (local-sql-bridge)
                                    ↓
                        ✅ Store user message in Cosmos DB (DIRECT)
                                    ↓
                        ✅ Fetch chat history from Cosmos DB (DIRECT)
                                    ↓
                            Chat Agent AI (generates response)
                                    ↓
                        ✅ Store assistant message in Cosmos DB (DIRECT)
                                    ↓
                            Return response to mobile app
```

**Key Point:** All Cosmos DB operations are **DIRECT REST API calls** - NO AI involvement in data storage.

---

## REST API Endpoints Used

### 1. **POST /api/chat/session**
**Purpose:** Create a new chat session

**Request:**
```json
{
  "user_id": "mobile_user",
  "session_name": "Mobile Chat - 12/7/2025"
}
```

**Response:**
```json
{
  "success": true,
  "chat_id": "chat-uuid-here"
}
```

**Used By:** `initializeChat()` on first app launch

---

### 2. **GET /api/chat/:chat_id/history**
**Purpose:** Load previous chat messages

**Query Params:**
- `limit` (optional): Max messages to return (default: 20)

**Response:**
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

**Used By:** `loadChatHistory()` when app loads

---

### 3. **POST /api/chat/message**
**Purpose:** Send a message and get AI response

**Request:**
```json
{
  "chat_id": "chat-uuid",
  "message": "Show me all my pending tasks"
}
```

**Response:**
```json
{
  "success": true,
  "user_message_id": "msg-uuid-1",
  "assistant_message_id": "msg-uuid-2",
  "response": "You have 5 pending tasks:\n1. Buy groceries\n2. Call dentist\n..."
}
```

**Used By:** `handleSend()` when user sends a message

**⚠️ Important:** This endpoint:
1. ✅ Stores user message directly in Cosmos DB
2. ✅ Fetches chat history directly from Cosmos DB
3. Calls AI to generate response (AI does NOT store messages)
4. ✅ Stores assistant message directly in Cosmos DB
5. Returns response to mobile app

---

## Mobile App Components

### ChatBoxPage.tsx

**State Management:**
- `chatId`: Current chat session UUID (stored in AsyncStorage)
- `messages`: Array of chat messages for display
- `loading`: Loading state during AI response
- `initializing`: Loading state during app initialization

**Key Functions:**

#### `initializeChat()`
- Checks AsyncStorage for existing `chat_id`
- If none exists, creates new session via POST `/api/chat/session`
- Stores `chat_id` in AsyncStorage for persistence
- Loads chat history from Cosmos DB

#### `loadChatHistory(chatIdToLoad: string)`
- Fetches messages via GET `/api/chat/:chat_id/history?limit=50`
- Converts backend format to mobile display format
- Updates UI with loaded messages

#### `handleSend()`
- Adds user message to UI immediately (optimistic UI)
- Sends message to backend via POST `/api/chat/message`
- Backend stores messages directly in Cosmos DB
- AI generates response using chat history
- Displays assistant response in UI
- Handles errors gracefully with user-friendly messages

---

## Configuration

### Server IP Setup

The mobile app uses AsyncStorage to store the backend server IP:

**Key:** `@memento_server_ip`
**Default:** `192.168.1.128`
**Port:** `3000`

**Set Server IP (from SettingsPage):**
```typescript
await AsyncStorage.setItem('@memento_server_ip', '192.168.1.100');
```

---

## Error Handling

### Network Errors
If the mobile app cannot reach the backend:
```
"Unable to connect to the server. Please check your connection and try again."
```

### Backend Errors
If the backend returns an error response:
```
"Sorry, I encountered an error processing your message. Please make sure you're connected to the server."
```

### Initialization Fallback
If session creation fails, the app generates a local chat ID:
```typescript
const localChatId = `chat-${Date.now()}`;
```

---

## Data Persistence

### Chat Session Persistence
- Chat sessions are stored in **Cosmos DB** (container: `chat`, partition key: `/chat`)
- Mobile app stores `chat_id` in **AsyncStorage** for session continuity
- On app restart, the same chat session is loaded from Cosmos DB

### Message Storage Format (Cosmos DB)
```json
{
  "id": "msg-uuid",
  "chat": "chat",
  "chat_id": "chat-uuid",
  "message": "Show my pending tasks",
  "role": "user",
  "timestamp": "2025-12-07T10:30:00Z",
  "metadata": {}
}
```

---

## AI Integration

### Chat Agent Service
The mobile app communicates with **chat-agent-service.js** via REST endpoints.

**AI Guardrails:**
- ✅ Only responds to task-related questions
- ✅ Refuses non-task queries politely
- ✅ Uses 11 MCP tools for task management
- ❌ Does NOT call `store_chat_message` or `get_chat_history` (REST API handles this)

**Available AI Tools:**
1. `create_task_from_chat` - Create tasks from conversation
2. `get_all_tasks` - Retrieve all tasks
3. `search_tasks` - Search by keyword
4. `get_completed_tasks` - Filter completed tasks
5. `edit_task` - Update task details
6. `mark_task_complete` - Mark as done
7. `delete_task` - Remove task
8. `get_tasks_summary` - Task statistics
9. `get_tasks_by_date` - Date range filtering
10. `bulk_delete_tasks` - Delete multiple tasks
11. `update_task_status` - Change completion status

---

## Testing Checklist

### ✅ Pre-Testing Setup
1. Start local-sql-bridge server: `node server.js` (port 3000)
2. Ensure Cosmos DB connection is configured
3. Ensure Azure SQL Database is accessible
4. Set correct server IP in mobile app settings

### ✅ Test Scenarios

**1. First Launch (New Session)**
- [ ] App creates new chat session
- [ ] Chat ID is saved to AsyncStorage
- [ ] Empty chat history is displayed
- [ ] User can send first message

**2. Send Message**
- [ ] User message appears immediately in UI
- [ ] Loading indicator shows "Thinking..."
- [ ] AI response appears after processing
- [ ] Both messages are persisted in Cosmos DB

**3. App Restart (Existing Session)**
- [ ] Chat ID is loaded from AsyncStorage
- [ ] Previous messages are fetched from Cosmos DB
- [ ] Conversation continues from last point

**4. Task Management Queries**
- [ ] "Show my tasks" → Lists all tasks
- [ ] "Create task: Buy milk" → Creates new task
- [ ] "Mark task X as complete" → Updates task status
- [ ] "Delete completed tasks" → Removes done tasks

**5. Error Handling**
- [ ] Server offline → "Unable to connect" message
- [ ] Backend error → "Encountered an error" message
- [ ] Network timeout → Graceful error display

---

## Development Notes

### Direct Database Operations
The mobile chat integration uses **direct REST API calls** to Cosmos DB:
- ✅ `chatContainer.items.create()` for storing messages
- ✅ `chatContainer.items.query()` for fetching history
- ❌ AI does NOT handle data persistence

### Benefits
1. **Faster**: Direct DB writes without AI overhead
2. **Reliable**: No AI function calling failures
3. **Clear**: Separation of concerns (storage vs intelligence)
4. **Cost-effective**: Reduced AI API calls

---

## Troubleshooting

### Issue: "Unable to connect to server"
**Solution:** 
1. Check server IP in Settings
2. Verify local-sql-bridge is running
3. Ensure mobile and server are on same network

### Issue: "Chat history not loading"
**Solution:**
1. Verify Cosmos DB connection in server.js
2. Check chat_id is valid in AsyncStorage
3. Confirm chat container exists with partition key `/chat`

### Issue: "AI not responding"
**Solution:**
1. Check Azure AI Foundry configuration
2. Verify API keys in server environment
3. Check chat-agent-service.js logs

---

## Future Enhancements

- [ ] Voice input for messages
- [ ] Image attachments for tasks
- [ ] Push notifications for AI suggestions
- [ ] Offline mode with local queue
- [ ] Multi-device sync via Cosmos DB
