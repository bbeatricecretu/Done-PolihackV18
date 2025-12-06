# Notification Data Flow & Format

## Overview

This document describes how notifications flow from the mobile device through the backend, including the exact data format at each stage.

---

## 📱 Stage 1: Device Notification (Android)

When a notification arrives on the user's Android device, Expo's notification API captures it with this structure:

```typescript
{
  request: {
    identifier: string,        // e.g., "com.whatsapp.w4b.123456"
    content: {
      title: string,           // e.g., "John Doe"
      body: string,            // e.g., "Meeting tomorrow at 3pm"
      data: object,            // App-specific data (varies by app)
      badge: number,
      sound: string | null,
      categoryIdentifier: string,
      threadIdentifier: string
    },
    trigger: {
      type: string,
      remoteMessage: object
    }
  },
  date: number                 // Unix timestamp
}
```

---

## 🧠 Stage 2: Local Intelligence Filter (Mobile)

The notification is processed through `LocalIntelligence.ts` on the device:

### Input:
- `title`: string
- `body`: string

### Processing:
1. **Noise Detection:** Checks if notification is social media spam
2. **Urgency Calculation:** Assigns score 0-100 based on keywords

### Output:
- If noise → **STOP** (notification discarded)
- If worthy → Continue to CloudConnector

---

## 🌐 Stage 3: CloudConnector (Mobile → Backend)

The notification is formatted and sent to the backend via HTTP POST.

### Endpoint:
```
POST http://localhost:3000/api/ingest/notification
Content-Type: application/json
```

### Payload Format:
```typescript
interface NotificationPayload {
  source_app: string;      // e.g., "WhatsApp", "Gmail", "Slack"
  title: string;           // Notification title
  body: string;            // Notification body/message
  timestamp: string;       // ISO 8601 format (e.g., "2025-12-06T10:30:00.000Z")
  urgency?: number;        // Optional: 0-100 (calculated by LocalIntelligence)
}
```

### Example Payloads:

**WhatsApp Message:**
```json
{
  "source_app": "WhatsApp",
  "title": "John Doe",
  "body": "Hey, don't forget about our meeting tomorrow at 3pm",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "urgency": 75
}
```

**Gmail:**
```json
{
  "source_app": "Gmail",
  "title": "Payment Due",
  "body": "Your electricity bill of $150 is due in 3 days",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "urgency": 85
}
```

**Calendar Reminder:**
```json
{
  "source_app": "Calendar",
  "title": "Upcoming Event",
  "body": "Team standup in 30 minutes",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "urgency": 90
}
```

---

## 🖥️ Stage 4: Backend Processing (Node.js)

The backend receives the notification and processes it through several steps:

### Step 1: Validation
- Checks required fields: `source_app`, `title`, `body`, `timestamp`
- Returns `400 Bad Request` if missing

### Step 2: Analysis
Current implementation uses keyword-based detection:

**Task-Creating Keywords:**
- meeting, reminder, deadline, due, tomorrow, today
- appointment, schedule, task, todo, bill, payment
- call, email, send, buy, pick up, deliver

**Noise Keywords (Ignore):**
- liked your, commented on, started following
- sent you, added you, tagged you, reacted, shared

**Future:** Will use Azure AI Foundry (GPT-4o) for intelligent analysis.

### Step 3: Task Creation (If Worthy)

If notification is task-worthy, backend creates a task via MCP server.

---

## 📤 Stage 5: Backend Response

The backend responds with the action taken.

### Response Format:
```typescript
interface ProcessNotificationResponse {
  success: boolean;
  action: 'task_created' | 'task_updated' | 'ignore';
  task?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
  };
  message?: string;
}
```

### Example Responses:

**Task Created:**
```json
{
  "success": true,
  "action": "task_created",
  "task": {
    "id": "task_1733487000_abc123",
    "title": "Meeting with John tomorrow at 3pm",
    "description": "Hey, don't forget about our meeting tomorrow at 3pm",
    "category": "meetings",
    "priority": "high",
    "source": "notification",
    "source_app": "WhatsApp",
    "due_date": "2025-12-07T15:00:00.000Z"
  },
  "message": "Task created successfully"
}
```

**Notification Ignored:**
```json
{
  "success": true,
  "action": "ignore",
  "message": "Notification does not require task creation"
}
```

**Error:**
```json
{
  "success": false,
  "action": "ignore",
  "message": "No network connection"
}
```

---

## 🔄 Stage 6: Mobile App Update

The mobile app receives the backend response and updates the UI:

```typescript
if (result.action === 'task_created') {
  console.log(`✓ Task created: ${result.task?.title}`);
  // TODO: Update local task cache
  // TODO: Show notification to user
  // TODO: Refresh tasks list
} else if (result.action === 'ignore') {
  console.log('Backend ignored notification');
}
```

---

## 🔀 Complete Flow Diagram

```
┌─────────────────┐
│  Device         │
│  Notification   │
│  (Android API)  │
└────────┬────────┘
         │
         │ Expo Notifications API
         ▼
┌─────────────────┐
│ NotificationLis-│
│ tener.ts        │
│ (Mobile)        │
└────────┬────────┘
         │
         │ title, body, appName
         ▼
┌─────────────────┐
│ LocalIntelli-   │
│ gence.ts        │◄─── Noise Filter (spam detection)
│ (Mobile)        │◄─── Urgency Calc (0-100)
└────────┬────────┘
         │
         │ If NOT noise
         ▼
┌─────────────────┐
│ CloudConnector  │
│ .ts (Mobile)    │
└────────┬────────┘
         │
         │ HTTP POST (JSON)
         │ {source_app, title, body, timestamp}
         ▼
┌─────────────────┐
│ Backend         │
│ /api/ingest/    │
│ notification    │
└────────┬────────┘
         │
         │ Keyword Analysis
         ▼
┌─────────────────┐
│ Task Creation   │◄─── (Future: MCP + Azure AI)
│ Decision        │
└────────┬────────┘
         │
         │ Response
         │ {success, action, task?, message}
         ▼
┌─────────────────┐
│ Mobile App UI   │◄─── Update task list
│ Update          │◄─── Show notification
└─────────────────┘
```

---

## 🧪 Testing the Flow

### 1. Send Test Notification via API

```bash
curl -X POST http://localhost:3000/api/ingest/notification \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "WhatsApp",
    "title": "Test User",
    "body": "Meeting tomorrow at 3pm",
    "timestamp": "2025-12-06T10:30:00.000Z"
  }'
```

### 2. Check Backend Logs

```
[Ingest] Received notification:
  App:   WhatsApp
  Title: Test User
  Body:  Meeting tomorrow at 3pm
  Time:  2025-12-06T10:30:00.000Z
[Ingest] ✓ Task created: Meeting tomorrow at 3pm
```

### 3. Verify Task Created

```bash
curl http://localhost:3000/api/tasks
```

---

## 🔐 Security Notes

- **Local Only:** Backend currently only accepts connections from localhost
- **No Auth:** Authentication not yet implemented (coming with Azure integration)
- **CORS:** Enabled for mobile app development (should be restricted in production)

---

## 🚀 Future Enhancements

1. **AI-Powered Analysis:** Replace keyword detection with GPT-4o
2. **MCP Integration:** Use MCP server for task operations
3. **Database Storage:** Persist tasks in Azure SQL
4. **Context Enrichment:** Add weather, calendar, location data
5. **Smart Categorization:** Auto-assign categories based on content
6. **Due Date Extraction:** Parse dates from notification text
7. **Priority Assignment:** AI-determined priority levels

---

## 📚 Related Files

- **Mobile Listener:** `mobile/src/services/NotificationListener.ts`
- **Mobile Connector:** `mobile/src/services/CloudConnector.ts`
- **Local Intelligence:** `mobile/src/services/LocalIntelligence.ts`
- **Backend Ingestion:** `backend/src/routes/ingest.ts`
- **Backend Tasks:** `backend/src/routes/tasks.ts`
