# Quick Start Guide - AI Agent Integration

## 🚀 Setup Steps

### 1. Configure Azure AI Foundry in `.env`

Open `local-sql-bridge/.env` and add:

```env
AZURE_AI_AGENT_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_AI_AGENT_API_KEY=your_api_key_here
AZURE_AI_AGENT_DEPLOYMENT_NAME=your_deployment_name
```

**Where to find these:**
- Log into Azure AI Foundry Portal
- Go to your project → Deployments
- Copy endpoint, API key, and deployment name

---

## 🧪 Testing (3 Easy Steps)

### Step 1: Add Test Notifications
```powershell
cd local-sql-bridge

# Basic test (5 simple notifications)
node add-test-notification.js 1

# Context-aware test (demonstrates editing/cancellation)
node add-test-notification.js 2

# Duplicate detection test
node add-test-notification.js 3

# All tests (recommended)
node add-test-notification.js 4
```

**Context-aware tests demonstrate:**
- 📝 Task editing: "Buy milk" → "Don't buy milk, buy eggs" 
- 🗑️ Task cancellation: "Dentist appointment" → "Appointment cancelled"
- ✅ Task completion: "Package arriving" → "Package delivered"

**Duplicate detection tests demonstrate:**
- ⏰ Time updates: "CEO meeting 10am" → "CEO meeting 10:30am" (edits existing)
- 📍 Location updates: "Team standup room A" → "Standup room B" (edits existing)
- 📋 Detail additions: "Buy groceries" → "Groceries: milk, eggs" (edits existing)
- 🔄 Status updates: "Call dentist" → "Dentist confirmed Tuesday" (edits existing)

### Step 2: Run Test Script
```powershell
node test-ai-agent.js
```

This will:
- ✅ Check your configuration
- ✅ Fetch unprocessed notifications
- ✅ Send them to AI agent for processing
- ✅ Show results

### Step 3: Check Results
```powershell
# View notification statistics
Invoke-RestMethod -Uri "http://localhost:3000/api/notification-stats"

# View created tasks
Invoke-RestMethod -Uri "http://localhost:3000/api/tasks"
```

---

## 📡 Production Usage

### Option A: Manual Trigger (Recommended)

Start your server:
```powershell
cd local-sql-bridge
node server.js
```

Trigger processing whenever you want:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/process-notifications" -Method POST
```

### Option B: Automatic Processing

Edit `.env`:
```env
AUTO_PROCESS_NOTIFICATIONS=true
AUTO_PROCESS_INTERVAL_MINUTES=5
```

Start your server:
```powershell
node server.js
```

The agent will automatically check for new notifications every 5 minutes.

---

## 🔍 Monitoring

### Check notification queue:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/notification-stats"
```

**Response:**
```json
{
  "total": 50,
  "unprocessed": 12,
  "processed": 38
}
```

### View all tasks:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/tasks"
```

---

## 🎯 How It Works

```
1. Mobile App → Sends notification
                    ↓
2. Local Bridge → Stores in CosmosDB (processed: false)
                    ↓
3. AI Agent Trigger (manual or auto)
                    ↓
4. AI Agent → Fetches:
   - Recent context from same source
   - Existing tasks from same source (duplicate check)
   - All recent pending tasks (broader duplicate check)
                    ↓
5. Azure AI Foundry → Analyzes with context and duplicate detection
   - Duplicate found? → EDIT existing task
   - New notification? → CREATE task
   - Modification? → EDIT existing task
   - Cancellation? → DELETE task
   - Completion? → MARK COMPLETE
   - Exact duplicate? → IGNORE
                    ↓
6. MCP Server → Executes action in Azure SQL
                    ↓
7. Mobile App Syncs → Shows updated tasks
```

### Context-Aware Intelligence

The agent remembers recent notifications from the same source (last 24 hours):

- **"Buy milk"** → Creates task
- **"Don't buy milk, buy eggs"** → Edits the task (doesn't create duplicate)
- **"Meeting at 3pm"** → Creates task  
- **"Meeting cancelled"** → Deletes the task
- **"Pick up package"** → Creates task
- **"Package delivered"** → Marks task as complete

### Duplicate Detection Intelligence

The agent checks existing tasks (last 7 days) to prevent duplicates:
## 🎓 What the AI Agent Does

✅ **Creates Tasks For:**
- Meetings & appointments
- Bills & financial deadlines
- Shopping reminders
- Important communications
- Health reminders

✏️ **Edits Tasks When:**
- Same source sends modification (e.g., "Don't buy milk, buy eggs")
- Details are updated (e.g., "Meeting moved to 4pm")
- Instructions change (e.g., "Call John at 3pm instead of 2pm")
- **Similar task already exists** (e.g., "CEO meeting 10am" → "CEO meeting 10:30am")

🔍 **Detects Duplicates:**
- Checks recent tasks from same source (last 7 days)
- Compares notification content with existing tasks
- Identifies similar subjects, times, and entities
- **Prevents creating duplicate tasks**
- **Edits existing task instead when appropriate**

🗑️ **Deletes Tasks When:**
- Cancellation detected (e.g., "Meeting cancelled", "Nevermind")
- No longer needed (e.g., "Changed my mind")

✅ **Completes Tasks When:**
- Completion indicated (e.g., "Package delivered", "Done", "Paid bill")

❌ **Ignores:**
- Social media (likes, comments)
- Promotional spam
- Generic chat messages
- System notifications
- **Exact duplicate reminders with no new information**

The agent analyzes:
1. **Existing tasks** (7 days) to prevent duplicates
2. **Recent notifications** (24 hours) from same source for context
3. **Semantic similarity** to detect related tasks even with different wording
- Bills & financial deadlines
- Shopping reminders
- Important communications
- Health reminders

✏️ **Edits Tasks When:**
- Same source sends modification (e.g., "Don't buy milk, buy eggs")
- Details are updated (e.g., "Meeting moved to 4pm")
- Instructions change (e.g., "Call John at 3pm instead of 2pm")

🗑️ **Deletes Tasks When:**
- Cancellation detected (e.g., "Meeting cancelled", "Nevermind")
- No longer needed (e.g., "Changed my mind")

✅ **Completes Tasks When:**
- Completion indicated (e.g., "Package delivered", "Done", "Paid bill")

❌ **Ignores:**
- Social media (likes, comments)
- Promotional spam
- Generic chat messages
- System notifications

The agent analyzes context from previous notifications (24 hours) from the same source to intelligently decide between creating, editing, deleting, or completing tasks!

## 🎓 What the AI Agent Does

✅ **Creates Tasks For:**
- Meetings & appointments
- Bills & financial deadlines
- Shopping reminders
- Important communications
- Health reminders

❌ **Ignores:**
- Social media (likes, comments)
- Promotional spam
- Generic chat messages
- System notifications

The agent automatically categorizes tasks and assigns priorities based on urgency!
