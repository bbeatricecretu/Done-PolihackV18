# Context-Aware Task Management Examples

## Example 1: Shopping List Modification

### Timeline:
```
10:00 AM - Notification from "Mom" (com.messages)
┌────────────────────────────────────┐
│ Title: Mom                         │
│ Content: Buy milk on your way home │
└────────────────────────────────────┘
         ↓
    AI Agent Decision: CREATE
         ↓
    Task Created: "Buy milk"
    ID: task-123
    Source: com.messages
```

```
10:05 AM - Another notification from "Mom" (com.messages)
┌──────────────────────────────────────────────┐
│ Title: Mom                                   │
│ Content: Actually, don't buy milk, buy eggs  │
│          instead                             │
└──────────────────────────────────────────────┘
         ↓
    AI Agent Checks Context:
    - Recent notifications from "com.messages"
    - Found: "Buy milk" (5 minutes ago)
    - Detected: Modification pattern ("don't", "instead")
         ↓
    AI Agent Decision: EDIT
         ↓
    Calls: edit_task(
      id: "task-123",
      title: "Buy eggs",
      description: "Updated from: buy milk"
    )
```

**Result:** One task "Buy eggs" (not two separate tasks)

---

## Example 2: Meeting Cancellation

### Timeline:
```
Monday 9:00 AM - Calendar notification
┌────────────────────────────────────────┐
│ Title: Calendar Reminder               │
│ Content: Dentist appointment Friday    │
│          at 2pm                        │
└────────────────────────────────────────┘
         ↓
    AI Agent Decision: CREATE
         ↓
    Task Created: "Dentist appointment Friday at 2pm"
    ID: task-456
    Category: meetings
    Priority: medium
    Source: com.calendar.app
```

```
Wednesday 3:00 PM - Calendar notification
┌────────────────────────────────────────┐
│ Title: Calendar Update                 │
│ Content: Dentist appointment cancelled │
└────────────────────────────────────────┘
         ↓
    AI Agent Checks Context:
    - Recent notifications from "com.calendar.app"
    - Found: "Dentist appointment" (2 days ago)
    - Detected: Cancellation pattern ("cancelled")
         ↓
    AI Agent Decision: DELETE
         ↓
    Calls: delete_task(id: "task-456")
```

**Result:** Task removed (no longer needed)

---

## Example 3: Package Delivery Completion

### Timeline:
```
8:00 AM - Delivery notification
┌────────────────────────────────────────┐
│ Title: Package Delivery                │
│ Content: Your package will arrive      │
│          today, please be home         │
└────────────────────────────────────────┘
         ↓
    AI Agent Decision: CREATE
         ↓
    Task Created: "Be home for package delivery"
    ID: task-789
    Category: general
    Priority: high (today)
    Source: com.delivery
```

```
4:30 PM - Delivery confirmation
┌────────────────────────────────────────┐
│ Title: Package Delivered               │
│ Content: Package has been delivered to │
│          your door                     │
└────────────────────────────────────────┘
         ↓
    AI Agent Checks Context:
    - Recent notifications from "com.delivery"
    - Found: "Package will arrive today" (8.5 hours ago)
    - Detected: Completion pattern ("delivered", "done")
         ↓
    AI Agent Decision: COMPLETE
         ↓
    Calls: mark_task_complete(id: "task-789")
```

**Result:** Task marked as completed automatically

---

## Example 4: Meeting Time Change

### Timeline:
```
9:00 AM - Meeting invitation
┌────────────────────────────────────────┐
│ Title: Team Meeting                    │
│ Content: Team standup tomorrow at 10AM │
└────────────────────────────────────────┘
         ↓
    Task Created: "Team standup tomorrow at 10AM"
```

```
2:00 PM - Meeting update
┌────────────────────────────────────────┐
│ Title: Team Meeting Updated            │
│ Content: Meeting moved to 2PM          │
└────────────────────────────────────────┘
         ↓
    AI Agent Decision: EDIT
         ↓
    Task Updated: "Team standup tomorrow at 2PM"
```

**Result:** Task time updated (not duplicated)

---

## Key Patterns the AI Detects

### Modification Keywords:
- "don't", "instead", "rather", "actually", "change to"
- "update", "modify", "different"

### Cancellation Keywords:
- "cancel", "cancelled", "nevermind", "changed my mind"
- "not anymore", "forget it", "no longer needed"

### Completion Keywords:
- "done", "completed", "finished", "delivered"
- "picked up", "paid", "sent"

### Update/Addition Keywords:
- "also", "additionally", "forgot to mention"
- "update:", "correction:", "change:"

---

## Context Window

The AI agent looks back **24 hours** for notifications from the same source (`appName`).

This means:
- ✅ "Buy milk" → "Don't buy milk" (5 minutes later) = DETECTED
- ✅ "Meeting at 3pm" → "Meeting cancelled" (same day) = DETECTED
- ❌ "Buy groceries" (3 days ago) → "Buy milk" (today) = SEPARATE TASKS

You can adjust the context window in `ai-agent-service.js`:
```javascript
getRecentNotificationsFromSameSource(appName, hoursBack = 24, limit = 5)
```

---

## How to Test Context-Aware Processing

1. **Add test notifications:**
   ```powershell
   node add-test-notification.js 2
   ```

2. **Process with AI agent:**
   ```powershell
   node test-ai-agent.js
   ```

3. **Observe the results:**
   - Check how many tasks were created vs edited vs deleted
   - Verify no duplicate tasks exist
   - Confirm cancellations removed tasks
   - Confirm completions marked tasks as done

4. **Check the database:**
   ```sql
   SELECT id, title, description, status, source_app, created_at, updated_at
   FROM Tasks
   ORDER BY updated_at DESC
   ```
