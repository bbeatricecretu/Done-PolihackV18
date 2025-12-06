# Memento Backend Architecture Guide

## 🎯 Quick Architecture Overview

```
Mobile App → REST API (FastAPI) → Business Logic → MCP Server → Azure AI Foundry Agent
                ↓                                                        ↓
           Azure SQL Database ←────────────────────────────────────────┘
```

## 🔄 Data Flow Explained

### Scenario 1: User Sends Notification
1. **Mobile App** receives notification: "Bill due tomorrow"
2. **LocalIntelligence** (Edge) filters noise → Not spam, send to backend
3. **REST API** receives `POST /api/ingest/notification`
4. **Backend** calls Azure AI Foundry agent with notification text
5. **Agent** calls MCP tool: `add_task(title="Pay bill", due_date="2025-12-07")`
6. **MCP Server** validates parameters → Executes tool
7. **Database** INSERT new task
8. **Response** returns to mobile app with task details
9. **UI** updates to show new task

### Scenario 2: User Says "Buy eggs instead of milk"
1. **Mobile App** sends chat: "Buy eggs instead of milk"
2. **REST API** receives `POST /api/ingest/chat`
3. **Agent** analyzes: "This is an update, not a new task"
4. **Agent** searches existing tasks → Finds task: "Buy milk"
5. **Agent** calls: `update_task(task_id="123", title="Buy eggs", update_reason="User changed request")`
6. **MCP Server** creates audit trail → Updates task
7. **Database** UPDATE task + INSERT into task_history
8. **Response** returns: "Updated task to buy eggs"
9. **UI** reflects change

### Scenario 3: User Opens App on Rainy Morning
1. **Mobile App** opens HomePage
2. **App** sends `GET /api/tasks/focus` with context: `{location: "home", weather: "rainy", time: "morning"}`
3. **Backend** enriches context with Azure Maps weather data
4. **Agent** calls: `suggest_focus_task(user_location="home", current_weather="rainy", time_of_day="morning")`
5. **MCP Server** fetches all pending tasks
6. **Hard Filter**: Remove outdoor tasks (lawn, car wash)
7. **Soft Rank**: Prioritize indoor + morning tasks
8. **Response**: Suggests "Pay bills online" (confidence: 85%)
9. **UI** displays suggested task with reason

## 🏗️ Component Responsibilities

### Mobile App (React Native)
- **What**: User interface
- **Responsibilities**:
  - Capture user input (notifications, chat, voice)
  - Local noise filtering (LocalIntelligence)
  - Send actionable data to backend REST API
  - Display tasks and suggestions
  - Collect context (location, time, battery)
- **Talks to**: Backend REST API only (HTTP)

### Backend FastAPI Server
- **What**: Business logic orchestrator
- **Responsibilities**:
  - Expose REST API for mobile app
  - Process input (notifications, chat, voice)
  - Enrich with context (weather from Azure Maps)
  - Host embedded MCP server
  - Manage database connections
  - Coordinate between mobile, agent, and database
- **Talks to**: 
  - Mobile app (REST API)
  - Azure AI Foundry agent (via MCP stdio)
  - Azure SQL Database (via SQLAlchemy)
  - Azure Maps API (HTTP)

### Custom MCP Server (stdio)
- **What**: Tool provider for agent
- **Responsibilities**:
  - Implement MCP protocol (JSON-RPC over stdio)
  - Expose 5 tools to agent
  - Validate tool parameters
  - Execute database operations
  - Enforce "no delete" constraint
  - Return structured results
- **Talks to**:
  - Azure AI Foundry agent (stdio)
  - Backend services (function calls)
  - Azure SQL Database (via SQLAlchemy)

### Azure AI Foundry Agent
- **What**: Intelligent decision maker (GPT-4o)
- **Responsibilities**:
  - Interpret user input (natural language)
  - Decide which tools to call
  - Determine parameters for tools
  - Generate natural language responses
  - Learn from context
- **Talks to**:
  - MCP server (stdio)
  - Reads: User input, system prompt, tool schemas
  - Writes: Tool calls, responses

### Azure SQL Database
- **What**: Persistent storage
- **Responsibilities**:
  - Store tasks with full history
  - Store context snapshots
  - Enforce data integrity (ACID)
  - Provide query performance (indexes)
  - Support audit trail (immutable history)
- **Talks to**:
  - Backend (via SQLAlchemy)
  - MCP Server (via SQLAlchemy)

## 🔧 Why This Architecture?

### Why Two Interfaces (REST + MCP)?

**Problem**: How do mobile app AND agent access the same data?

**Bad Solution**: 
```
Mobile App ─────→ Agent ─────→ Database
              (Everything goes through agent - slow, unreliable)
```

**Good Solution**:
```
Mobile App ──REST──→ Backend ──MCP──→ Agent
                       ↓
                   Database
```

**Benefits**:
- ✅ Mobile app gets instant responses (no agent latency)
- ✅ Agent only involved when intelligence needed
- ✅ Backend controls all database access (security)
- ✅ Can test each layer independently

### Why MCP Instead of Direct Function Calling?

**Problem**: How do we give agent access to tools safely?

**Option 1: Direct Database Access**
```python
agent.add_tool("run_sql", lambda query: db.execute(query))
```
❌ Security nightmare - agent could run `DROP TABLE`  
❌ No validation - malformed queries  
❌ No audit trail - who did what?

**Option 2: MCP Tools**
```python
@mcp_tool
def add_task(title: str, description: str = None):
    validate(title)  # ✅ Validation
    audit_log(user, "add_task")  # ✅ Audit
    return db.insert_task(title, description)  # ✅ Safe
```
✅ Type-safe with Pydantic  
✅ Validated parameters  
✅ Audit trail  
✅ No delete tool = no accidental data loss

### Why Azure SQL Instead of NoSQL?

**Tasks are relational data**:
- Task has many history entries (1-to-many)
- Task has associated contexts (1-to-many)
- User has many tasks (1-to-many)
- Need JOINs for complex queries

**Example Query**:
```sql
SELECT t.*, h.change_type, h.changed_at
FROM tasks t
LEFT JOIN task_history h ON t.id = h.task_id
WHERE t.user_id = @user_id
  AND t.status = 'pending'
  AND t.due_date < @tomorrow
ORDER BY t.priority DESC, t.due_date ASC;
```

This is **trivial in SQL**, **painful in NoSQL**.

### Why Embedded MCP Server?

**Option 1: Separate Service**
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Backend │───▶│ MCP Srv │───▶│ Agent   │
└─────────┘    └─────────┘    └─────────┘
     │              │
     └──────┬───────┘
            ▼
       ┌─────────┐
       │ Database│
       └─────────┘
```
- Two connection pools
- Network latency between services
- More deployment complexity

**Option 2: Embedded (Our Choice)**
```
┌──────────────────────┐
│      Backend         │
│  ┌────────────────┐  │    ┌─────────┐
│  │  REST API      │  │    │ Agent   │
│  ├────────────────┤  │───▶│         │
│  │  MCP Server    │◀─┼────│         │
│  └────────────────┘  │    └─────────┘
│          │           │
│          ▼           │
│    ┌─────────┐      │
│    │ DB Pool │      │
│    └─────────┘      │
└──────────────────────┘
         │
         ▼
    ┌─────────┐
    │ Database│
    └─────────┘
```
- Single connection pool
- No network overhead
- Simpler deployment
- Shared business logic

**Tradeoff**: If backend crashes, both REST and MCP are down.  
**Acceptable**: For demo/hackathon. Production could split later.

## 📊 Database Schema Design

### Why 4 Tables?

**1. `tasks` - Current State**
```sql
id              GUID (primary key)
title           NVARCHAR(500)
description     NVARCHAR(MAX)
status          NVARCHAR(50)      -- pending, in_progress, completed, archived
priority        NVARCHAR(20)      -- low, medium, high, urgent
category        NVARCHAR(50)      -- work, personal, social, etc.
source          NVARCHAR(50)      -- notification, voice, chat, note, manual
due_date        DATETIME2
created_at      DATETIME2
updated_at      DATETIME2
is_deleted      BIT               -- soft delete flag (never hard delete)
```

**2. `task_history` - Audit Trail**
```sql
id              GUID (primary key)
task_id         GUID (foreign key → tasks.id)
change_type     NVARCHAR(50)      -- created, updated, completed, archived
field_name      NVARCHAR(100)     -- which field changed
old_value       NVARCHAR(MAX)
new_value       NVARCHAR(MAX)
update_reason   NVARCHAR(500)     -- why it changed
changed_at      DATETIME2
changed_by      NVARCHAR(100)     -- agent or user
```

**3. `task_contexts` - Context at Creation/Update**
```sql
id              GUID (primary key)
task_id         GUID (foreign key → tasks.id)
location        NVARCHAR(100)     -- home, office, commute
weather         NVARCHAR(50)      -- sunny, rainy, etc.
time_of_day     NVARCHAR(20)      -- morning, afternoon, etc.
user_energy     NVARCHAR(20)      -- high, medium, low
snapshot_at     DATETIME2
```

**4. `user_contexts` - Current User State**
```sql
id              GUID (primary key)
user_id         GUID
location        NVARCHAR(100)
weather         NVARCHAR(50)
temperature     INT
calendar_free   BIT
next_event      DATETIME2
battery_level   INT
timestamp       DATETIME2
```

### Why This Schema?

**Principle 1: Never Delete Data**
- `is_deleted` flag instead of `DELETE`
- Full history in `task_history`
- Can reconstruct any past state

**Principle 2: Context is First-Class**
- Separate `task_contexts` table
- Can query: "Show tasks created during rainy days"
- Analytics: "Which contexts lead to task completion?"

**Principle 3: Audit Everything**
- Every change logged with reason
- Can answer: "Why did this task change?"
- Debugging: "What did the agent do?"

## 🔒 Security Model

### Authentication Flow
```
1. User logs in → Mobile app gets JWT token
2. Mobile sends JWT in header: `Authorization: Bearer <token>`
3. Backend validates JWT → Extracts user_id
4. All database queries filtered by user_id
```

### MCP Server Security
- **No authentication** between agent and MCP server (same trust boundary)
- **Validation** at MCP layer (Pydantic schemas)
- **No direct SQL** - only predefined tools
- **No delete** - enforced at server level

### Azure SQL Security
- **Connection string** in environment variables (never in code)
- **Firewall rules** restrict access
- **Encrypted connections** (TLS)
- **Production**: Use Azure AD authentication, not SQL auth

## 🚀 Deployment Options

### Option 1: Local Development (Demo)
```
Laptop: Backend (FastAPI + MCP) + Mobile Emulator
Cloud: Azure SQL + Azure AI Foundry + Azure Maps
```
**Pros**: Easy debugging, fast iteration  
**Cons**: Not accessible from real phones

### Option 2: Hybrid (Recommended for Hackathon)
```
Laptop: Mobile app (on device via Expo)
Cloud: Backend (Azure App Service) + Azure SQL + Azure AI Foundry
```
**Pros**: Real device testing, shareable  
**Cons**: Slight deployment complexity

### Option 3: Full Cloud (Production)
```
Cloud: Everything on Azure
```
**Pros**: Scalable, reliable, monitored  
**Cons**: Higher cost, more setup

## 📈 Scaling Considerations

### Current Architecture (Demo Scale)
- 1-10 users
- Backend: Single instance
- Database: Basic tier (5 DTU)
- Agent: Pay-per-call

### Future Production (1000+ users)
- Backend: Multiple instances behind load balancer
- Database: Standard tier (100 DTU) + read replicas
- MCP Server: Separate microservice with Redis cache
- Agent: Reserved capacity or multiple agents

## 🎓 Key Takeaways

1. **Two Interfaces**: REST for mobile, MCP for agent
2. **Azure AI Foundry**: Managed agent runtime, no OpenAI API keys needed
3. **Custom MCP**: Full control over tools, safety enforced server-side
4. **Azure SQL**: Relational data needs relational database
5. **Embedded MCP**: Simpler for demo, can split later
6. **No Delete**: Soft delete with audit trail
7. **Context-First**: Context is as important as task data
8. **stdio Transport**: Required by Azure AI Foundry, simpler than HTTP

## 🔗 Related Documents

- [Backend README.md](./README.md) - Full technical documentation
- [API Documentation](http://localhost:8000/docs) - FastAPI auto-generated docs
- [MCP Tools Reference](./README.md#mcp-tools) - Tool schemas and examples
