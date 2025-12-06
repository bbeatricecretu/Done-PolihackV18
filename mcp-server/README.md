# MCP Task Server

Model Context Protocol (MCP) server for intelligent task management with Azure AI Foundry.

## Features

This MCP server provides 10 specialized tools for AI agents to manage tasks:

### 1. **get_notifications** ⭐
Get all notifications from CosmosDB for agent review.
- **Read-only access** to notification data
- Agent analyzes each notification to determine relevance
- Returns notification details: id, app, title, body, timestamp
- Default limit: 50 notifications (configurable)

### 2. **delete_notification** ⭐
Delete a notification from CosmosDB after processing.
- Should be called after reviewing each notification
- Call regardless of whether a task was created
- Keeps CosmosDB clean by removing processed notifications

### 3. **create_task_from_notification**
Create a task based on reviewed notification data.
- Use after analyzing notification with `get_notifications`
- Agent decides if notification is relevant for task creation
- Extracts: title, description, category, priority, source_app
- Sets `source: "notification"` in database

### 4. **create_task_from_chat**
Creates tasks from chatbot conversations with context flags.
- Supports location/weather/time dependency flags
- AI agent can set these flags based on conversation context
- Example: "Remind me to buy groceries when I'm near a store" → `location_dependent: true`

### 5. **suggest_tasks_by_context**
Suggests relevant tasks based on user's location, weather, or time.
- Uses **Azure Maps API** to find locations mentioned in task descriptions
- Searches for Points of Interest (POIs) within configurable radius
- Returns tasks with nearby relevant locations
- Supports weather-dependent and time-dependent task suggestions

### 6. **mark_task_complete**
Marks a task as completed with timestamp.
- Sets `status: "completed"`
- Records `completed_at` timestamp
- Updates `updated_at` timestamp

### 7. **edit_task**
Partial updates to existing tasks.
- Update any field: title, description, category, priority, due_date
- Toggle location/weather/time dependency flags
- Validates and updates timestamps

### 8. **get_important_tasks**
Returns the N most important tasks based on priority and due date.
- Default: top 3 tasks
- Sorting: HIGH priority → due date (ascending) → creation date (descending)
- Optional: include completed tasks

### 9. **get_tasks_by_filter**
Dynamic task filtering with multiple criteria.
- Filter by: category, priority, status
- Filter by dependency flags: location_dependent, weather_dependent, time_dependent
- Combines all filters with AND logic

### 10. **delete_task**
Soft-deletes a task (sets `is_deleted = 1`).

---

## Notification Processing Workflow

The AI agent has **read-only access** to CosmosDB notifications. Here's the recommended workflow:

1. **Agent calls `get_notifications()`** - Retrieves unprocessed notifications
2. **Agent analyzes each notification** - Determines if it's relevant for task creation/editing
3. **Agent decides action:**
   - **Create task:** Calls `create_task_from_notification()` with extracted data
   - **Edit existing task:** Calls `edit_task()` with task ID and updates
   - **Delete task:** Calls `delete_task()` if notification indicates task completion
   - **No action:** If notification is irrelevant, skip to next step
4. **Agent calls `delete_notification()`** - Removes processed notification from CosmosDB

### Example Flow:
```
1. get_notifications() → Returns 5 notifications
2. Notification #1: "Meeting reminder for 3pm" 
   → create_task_from_notification(title="Team meeting", category="meetings", priority="high")
   → delete_notification(notification_id="abc-123")
3. Notification #2: "Spam promotion"
   → No action (irrelevant)
   → delete_notification(notification_id="def-456")
4. Notification #3: "Task completed: Buy groceries"
   → mark_task_complete(id="xyz-789")
   → delete_notification(notification_id="ghi-012")
```

---

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:

```env
# Azure SQL Database
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SERVER=your_server.database.windows.net

# CosmosDB (for notifications)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=your_notifications_database
COSMOS_CONTAINER=notifications

# Azure Maps (for location-based suggestions)
AZURE_MAPS_KEY=your_azure_maps_subscription_key
```

### 3. Build the Server
```bash
npm run build
```

### 4. Test the Server
```bash
npm start
```

---

## Integration with Azure AI Foundry

This MCP server uses **stdio transport**, which is the standard for Azure AI Foundry agents.

### Adding to Azure AI Foundry:

1. Build the server: `npm run build`
2. In Azure AI Foundry, add an MCP server connection
3. Point to: `node dist/index.js`
4. The agent will communicate via stdin/stdout

### Example Agent Prompts:

**Processing notifications:**
```
Agent workflow (automatic/scheduled):
1. get_notifications(limit=10)
2. For each notification:
   - Analyze content and relevance
   - Decide: create_task / edit_task / delete_task / no action
   - delete_notification(notification_id) after processing
```

**Creating tasks from chat:**
```
User: "Remind me to buy milk when I'm near a grocery store"
Agent: Uses create_task_from_chat with location_dependent=true
```

**Context-aware suggestions:**
```
User: "What should I do near me?"
Agent: Uses suggest_tasks_by_context with current GPS coordinates
Returns: Tasks with nearby relevant locations from Azure Maps
```

**Getting important tasks:**
```
User: "What are my top priorities today?"
Agent: Uses get_important_tasks(count=5, include_completed=false)
```

---

## Database Schema Requirements

The server expects these columns in the `Tasks` table:

```sql
CREATE TABLE Tasks (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX),
    category NVARCHAR(50),
    priority NVARCHAR(20),
    status NVARCHAR(20),
    due_date DATETIME2(7),
    created_at DATETIME2(7),
    updated_at DATETIME2(7),
    completed_at DATETIME2(7),
    source NVARCHAR(50),
    source_app NVARCHAR(100),
    is_deleted BIT,
    LocationDependent BIT,
    TimeDependent BIT,
    WeatherDependent BIT
);
```

---

## Azure Maps Integration

The `suggest_tasks_by_context` tool uses Azure Maps Nearby Search API:

- **Endpoint:** `https://atlas.microsoft.com/search/nearby/json`
- **Features:**
  - Search for POIs near user location
  - Extract location names, addresses, and distances
  - Match POIs to task descriptions (e.g., "buy groceries" → nearby grocery stores)

**Example Response:**
```json
[
  {
    "task_id": "123e4567-e89b-12d3-a456-426614174000",
    "task_title": "Buy groceries",
    "nearby_locations": [
      {
        "name": "Whole Foods Market",
        "address": "123 Main St",
        "distance": 450,
        "position": { "lat": 37.7749, "lon": -122.4194 }
      }
    ],
    "reason": "Location-dependent task with nearby relevant locations"
  }
]
```

---

## CosmosDB Integration

The `create_task_from_notification` tool reads from CosmosDB:

- **Container:** Notifications from Android devices
- **Document Structure:**
  ```json
  {
    "id": "notification-uuid",
    "app": "com.example.app",
    "body": "Notification text",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```
- **Usage:** Agent can create tasks from notifications with `notification_id` parameter

---

## Development

### Build
```bash
npm run build
```

### Watch Mode (for development)
```bash
npm run watch
```

---

## License

MIT
