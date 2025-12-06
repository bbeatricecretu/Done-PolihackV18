# Notification Processing Workflow

## Overview

The AI agent has **read-only access** to CosmosDB notifications. This design ensures the agent analyzes each notification before deciding whether to create, edit, or delete tasks.

---

## Workflow Steps

### 1. Retrieve Notifications
```typescript
Tool: get_notifications
Parameters: { limit?: number } // default: 50

Returns: Array of notifications
[
  {
    "id": "notification-uuid-123",
    "app": "com.example.calendar",
    "title": "Meeting reminder",
    "body": "Team meeting in 30 minutes",
    "timestamp": "2024-12-06T10:30:00Z"
  },
  ...
]
```

### 2. Agent Analysis
For each notification, the agent determines:
- **Is this relevant?** (filter spam, promotional content)
- **What action is needed?**
  - Create a new task
  - Edit an existing task
  - Mark a task as complete
  - Delete a task
  - No action needed

### 3. Execute Action (If Relevant)

#### Option A: Create Task
```typescript
Tool: create_task_from_notification
Parameters: {
  title: "Extracted from notification",
  description: "Optional description",
  category: "meetings" | "finance" | "shopping" | "communication" | "health" | "general",
  priority: "low" | "medium" | "high",
  source_app: "com.example.calendar",
  notification_id: "notification-uuid-123"
}
```

#### Option B: Edit Existing Task
```typescript
Tool: edit_task
Parameters: {
  id: "existing-task-uuid",
  title?: "Updated title",
  description?: "Updated description",
  priority?: "high",
  // ... any field to update
}
```

#### Option C: Mark Task Complete
```typescript
Tool: mark_task_complete
Parameters: {
  id: "existing-task-uuid"
}
```

#### Option D: Delete Task
```typescript
Tool: delete_task
Parameters: {
  id: "existing-task-uuid"
}
```

#### Option E: No Action
Skip to step 4 (delete notification)

### 4. Delete Notification (Always)
```typescript
Tool: delete_notification
Parameters: {
  notification_id: "notification-uuid-123"
}

// Call this AFTER processing, regardless of whether an action was taken
// Keeps CosmosDB clean by removing processed notifications
```

---

## Example Scenarios

### Scenario 1: Meeting Reminder → Create Task
```
Notification:
{
  "id": "notif-001",
  "app": "com.google.calendar",
  "title": "Meeting in 1 hour",
  "body": "Project review meeting at 2pm in Conference Room A"
}

Agent Actions:
1. get_notifications() → Retrieves notification
2. Analysis: Relevant meeting reminder
3. create_task_from_notification({
     title: "Project review meeting",
     description: "2pm in Conference Room A",
     category: "meetings",
     priority: "high",
     source_app: "com.google.calendar",
     notification_id: "notif-001"
   })
4. delete_notification({ notification_id: "notif-001" })
```

### Scenario 2: Payment Reminder → Create Task
```
Notification:
{
  "id": "notif-002",
  "app": "com.banking.app",
  "title": "Bill due soon",
  "body": "Electricity bill of $150 due on Dec 10"
}

Agent Actions:
1. get_notifications() → Retrieves notification
2. Analysis: Important financial task
3. create_task_from_notification({
     title: "Pay electricity bill",
     description: "$150 due on Dec 10",
     category: "finance",
     priority: "high",
     source_app: "com.banking.app",
     notification_id: "notif-002"
   })
4. delete_notification({ notification_id: "notif-002" })
```

### Scenario 3: Spam Notification → Delete Only
```
Notification:
{
  "id": "notif-003",
  "app": "com.spam.app",
  "title": "Hot deals!",
  "body": "Click here for 50% off!"
}

Agent Actions:
1. get_notifications() → Retrieves notification
2. Analysis: Spam/promotional content, not relevant
3. No task action
4. delete_notification({ notification_id: "notif-003" })
```

### Scenario 4: Task Completion Notification → Mark Complete
```
Notification:
{
  "id": "notif-004",
  "app": "com.todo.app",
  "title": "Task completed",
  "body": "You completed: Buy groceries"
}

Agent Actions:
1. get_notifications() → Retrieves notification
2. Analysis: Task completion indicator
3. Search for task: get_tasks_by_filter({ category: "shopping" })
4. mark_task_complete({ id: "task-uuid-xyz" })
5. delete_notification({ notification_id: "notif-004" })
```

### Scenario 5: Delivery Notification → Update Task
```
Notification:
{
  "id": "notif-005",
  "app": "com.amazon.app",
  "title": "Package delivered",
  "body": "Your order #12345 has been delivered"
}

Agent Actions:
1. get_notifications() → Retrieves notification
2. Analysis: Delivery confirmation
3. Search for task: get_tasks_by_filter({ description: "order #12345" })
4. mark_task_complete({ id: "task-uuid-abc" })
5. delete_notification({ notification_id: "notif-005" })
```

---

## Agent Decision Logic

### Relevance Filtering
**Create task if:**
- Calendar/meeting reminders
- Payment/bill reminders
- Important emails or messages
- Health appointments
- Delivery tracking
- Time-sensitive events

**Ignore (delete only) if:**
- Promotional content
- Spam notifications
- Social media likes/follows
- App update notifications
- Low-priority system alerts

### Priority Assignment
- **High:** Meetings, bills, appointments, deadlines
- **Medium:** General reminders, emails, messages
- **Low:** Optional tasks, suggestions

### Category Mapping
| Notification Source | Category |
|---------------------|----------|
| Calendar apps | `meetings` |
| Banking/payment apps | `finance` |
| Shopping/delivery apps | `shopping` |
| Email/messaging apps | `communication` |
| Health/fitness apps | `health` |
| Everything else | `general` |

---

## Batch Processing

For efficiency, the agent can process notifications in batches:

```typescript
// Recommended batch size: 10-20 notifications
const notifications = await get_notifications({ limit: 20 });

for (const notif of notifications) {
  // Analyze
  const action = analyzeNotification(notif);
  
  // Execute action
  if (action.type === "create_task") {
    await create_task_from_notification({ ...action.params });
  } else if (action.type === "mark_complete") {
    await mark_task_complete({ ...action.params });
  }
  // ... other actions
  
  // Always delete notification after processing
  await delete_notification({ notification_id: notif.id });
}
```

---

## CosmosDB Schema

Expected notification document structure:

```typescript
{
  "id": string,              // Unique identifier (required)
  "app": string,             // Package name or app identifier
  "title": string,           // Notification title
  "body": string,            // Notification body/content
  "timestamp": string,       // ISO 8601 timestamp
  "packageName"?: string,    // Alternative to "app"
  "_ts"?: number            // Cosmos internal timestamp (auto-generated)
}
```

---

## Error Handling

### CosmosDB Not Configured
```typescript
Response: "CosmosDB not configured. Please set COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, and COSMOS_CONTAINER in .env"
```

**Solution:** Configure environment variables in `.env` file

### Notification Not Found
```typescript
Error: "Error deleting notification: Not found"
```

**Cause:** Notification ID doesn't exist or already deleted

### Empty Notification List
```typescript
Response: [] // Empty array
```

**Cause:** All notifications processed or none exist

---

## Best Practices

1. **Process regularly:** Schedule agent to check notifications every 5-15 minutes
2. **Batch processing:** Process 10-20 notifications at a time to avoid overload
3. **Always delete:** Call `delete_notification()` even if no action taken
4. **Error handling:** Log failures but continue processing remaining notifications
5. **Duplicate prevention:** Check if task already exists before creating new one
6. **Smart categorization:** Use app package name to infer task category
7. **Priority intelligence:** Use keywords (urgent, important, today) to set priority

---

## Monitoring

Track these metrics:
- Notifications processed per day
- Task creation rate (tasks created / notifications processed)
- Spam filter accuracy (false positives/negatives)
- Processing time per notification
- CosmosDB read/delete operations

---

## Security

- **Read-only access:** Agent cannot modify notification content, only read and delete
- **No notification creation:** Agent cannot add fake notifications
- **Isolated storage:** Notifications stored separately from tasks in CosmosDB
- **Audit trail:** Task records include `notification_id` for traceability
