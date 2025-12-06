# Memento Backend - Custom MCP Server for Azure AI Foundry

## 🧠 Core Philosophy
This backend is a **Custom MCP (Model Context Protocol) Server** that provides Azure AI Foundry agents with tools to manage tasks intelligently. 
The goal is to support the "Anti-To-Do List" concept: **Filtering reality so the user can focus on the present.**

**Key Principle: ADD-ONLY, NEVER DELETE**
- The AI agent can ADD tasks from any source
- The AI agent can EDIT/UPDATE tasks based on new information
- The AI agent CANNOT DELETE tasks (user control only)
- This preserves user agency while enabling intelligent assistance

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP (Edge)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LocalIntelligence.ts - Noise Filter (OTP, Marketing)    │  │
│  │  CloudConnector.ts - Sends to Backend API                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI Server)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              REST API Endpoints Layer                     │  │
│  │  - POST /api/ingest/notification (mobile → backend)      │  │
│  │  - POST /api/ingest/chat (user chat input)              │  │
│  │  - GET  /api/tasks/focus (get suggestion)               │  │
│  │  - GET  /api/tasks (list tasks)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────┐  │
│  │           Business Logic / Service Layer                 │  │
│  │  - Input Processing (parse notifications, chat)         │  │
│  │  - Context Enrichment (weather, location, time)         │  │
│  │  - Task Management (CRUD operations)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────┐  │
│  │              CUSTOM MCP SERVER (stdio)                   │  │
│  │  - Implements MCP Protocol (JSON-RPC over stdio)        │  │
│  │  - Tool Registry (5 core tools)                         │  │
│  │  - Tool Execution Engine                                │  │
│  │  - Safety Guardrails (no delete enforcement)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP stdio Protocol
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AZURE AI FOUNDRY (Agent)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Agent Runtime - GPT-4o with Function Calling           │  │
│  │  - Connects to MCP server via stdio                     │  │
│  │  - Discovers available tools                            │  │
│  │  - Calls tools based on user input                      │  │
│  │  - Returns structured responses                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Azure SQL Client Library
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AZURE SQL DATABASE                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Tables:                                                  │  │
│  │  - tasks (main task storage)                            │  │
│  │  - task_history (full audit trail)                      │  │
│  │  - task_contexts (associated context snapshots)         │  │
│  │  - user_contexts (current user state)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

            ┌────────────────────────────────┐
            │  EXTERNAL AZURE SERVICES       │
            │  - Azure Maps API (Weather)    │
            │  - Microsoft Graph (Calendar)  │
            └────────────────────────────────┘
```

## 🔧 Architecture Components Explained

### 1. Mobile App (Edge Brain)
**Location:** User's device (React Native/Expo)  
**Responsibility:** First-line noise filtering
- Filters obvious junk locally (OTPs, marketing)
- Sends actionable data to Backend REST API
- Receives task updates and displays UI

### 2. Backend FastAPI Server
**Location:** Can run locally or Azure App Service  
**Responsibility:** Business logic orchestration

**Key Layers:**
- **REST API Layer**: HTTP endpoints for mobile app and web clients
- **Service Layer**: Business logic, input processing, context enrichment
- **MCP Server Layer**: Embedded MCP server using stdio protocol
- **Database Layer**: Azure SQL connection via SQLAlchemy

**Why This Architecture?**
- Separates client-facing REST API from AI agent communication (MCP)
- Backend orchestrates both mobile requests AND agent tool calls
- Single source of truth for task data
- Can scale independently (REST API vs MCP server)

### 3. Custom MCP Server (stdio Protocol)
**Location:** Embedded within Backend FastAPI process  
**Responsibility:** Tool provider for Azure AI Foundry agent

**Implementation:** Python MCP SDK (stdio transport)
- Runs as a subprocess or integrated process
- Communicates with Azure AI Foundry via JSON-RPC over stdin/stdout
- Exposes 5 core tools (add_task, update_task, suggest_focus_task, etc.)
- Validates all tool calls before database operations
- Enforces "no delete" constraint

### 4. Azure AI Foundry Agent
**Location:** Azure AI Foundry service (cloud)  
**Responsibility:** Intelligent decision-making

**Capabilities:**
- Connects to custom MCP server via stdio
- Discovers available tools at runtime
- Interprets user input (notifications, chat, voice)
- Decides which tools to call with what parameters
- Returns natural language responses

**Configuration:**
- System prompt defines agent behavior
- Tool schemas auto-discovered from MCP server
- Function calling with structured outputs

### 5. Azure SQL Database
**Location:** Azure SQL Database (cloud)  
**Responsibility:** Persistent storage

**Schema Design:**
- `tasks` - Main task storage with soft delete (status='archived')
- `task_history` - Immutable audit trail
- `task_contexts` - Context snapshot when task was created/updated
- `user_contexts` - Current user state (location, weather, time)

**Connection:** SQLAlchemy ORM with `pyodbc` driver

## 🛠 Tech Stack (Azure-Native Architecture)

### Backend Server
*   **Framework:** Python FastAPI - REST API + MCP server host
*   **MCP Implementation:** Python MCP SDK (`mcp` package) with stdio transport
*   **Database ORM:** SQLAlchemy with Azure SQL support
*   **Database Driver:** `pyodbc` or `pymssql` for Azure SQL connectivity
*   **Migrations:** Alembic for schema management

### Azure Services
*   **Azure AI Foundry:** Agent runtime with GPT-4o model
*   **Azure SQL Database:** Fully managed relational database
*   **Azure Maps API:** Weather and location context
*   **Microsoft Graph API:** Calendar integration (optional)
*   **Azure Key Vault:** Secure storage for connection strings and API keys (production)
*   **Azure App Service:** Hosting for FastAPI backend (optional, can run locally)

### MCP Protocol
*   **Transport:** stdio (standard input/output) - required by Azure AI Foundry
*   **Protocol:** JSON-RPC 2.0 over stdio
*   **SDK:** Official Python MCP SDK from Anthropic/Azure
*   **Tool Definition:** JSON Schema for parameters and returns

### Development Tools
*   **Environment:** Python 3.11+
*   **Package Manager:** pip with requirements.txt
*   **Testing:** pytest for unit and integration tests
*   **API Documentation:** FastAPI auto-generated OpenAPI docs
*   **Logging:** Python logging with Azure Application Insights integration (optional)

## ☁️ Why Azure AI Foundry + Custom MCP?

### Azure AI Foundry Benefits
*   **Managed Agent Runtime**: No need to manage OpenAI API calls directly
*   **Built-in MCP Support**: Native integration with MCP servers via stdio
*   **Enterprise Features**: Monitoring, logging, version control for agents
*   **Cost Effective**: Pay only for agent invocations, not infrastructure
*   **Easy Deployment**: Agent configuration in Azure portal, code in GitHub

### Custom MCP Server Benefits
*   **Full Control**: Define exactly what tools the agent can access
*   **Safety Guardrails**: Enforce "no delete" rule at server level
*   **Business Logic**: Keep sensitive logic server-side, not in agent prompts
*   **Database Access**: Direct connection to Azure SQL, not exposed to agent
*   **Testable**: Unit test tools independently from agent
*   **Reusable**: Same MCP server can be used by multiple agents or clients

### Why Not Direct Database Access?
❌ **Don't give agent direct SQL access** - Security risk, no validation, potential data loss  
✅ **Use MCP tools** - Controlled, validated, audited, safe operations

---

## 🔨 Building the Custom MCP Server

### MCP Architecture Pattern

The MCP server acts as a **tool provider** that the Azure AI Foundry agent connects to. Here's how to structure it:

```
backend/
├── main.py                 # FastAPI app for REST API
├── mcp_server.py          # MCP server implementation (stdio)
├── requirements.txt       # Python dependencies
├── .env                   # Configuration
├── models/
│   ├── __init__.py
│   ├── task.py           # SQLAlchemy Task model
│   ├── task_history.py   # Audit trail model
│   └── context.py        # Context models
├── services/
│   ├── __init__.py
│   ├── task_service.py   # Business logic for tasks
│   ├── context_service.py # Context enrichment
│   └── azure_maps.py     # Weather API integration
├── mcp/
│   ├── __init__.py
│   ├── server.py         # MCP server setup
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── add_task.py   # Tool: add_task
│   │   ├── update_task.py # Tool: update_task
│   │   ├── suggest_task.py # Tool: suggest_focus_task
│   │   ├── get_tasks.py  # Tool: get_task_list
│   │   └── get_context.py # Tool: get_context
│   └── schemas.py        # Pydantic schemas for tool params
├── database/
│   ├── __init__.py
│   ├── connection.py     # Azure SQL connection
│   └── migrations/       # Alembic migrations
└── tests/
    ├── test_tools.py     # Unit tests for MCP tools
    └── test_services.py  # Business logic tests
```

### Step 1: Install MCP SDK

```bash
pip install mcp
pip install fastapi uvicorn
pip install sqlalchemy pyodbc
pip install azure-identity azure-maps-render
pip install python-dotenv pydantic
```

### Step 2: Create MCP Server Core (`mcp/server.py`)

```python
"""
MCP Server for Memento Task Intelligence
Implements stdio transport for Azure AI Foundry
"""
import asyncio
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from typing import Any

# Import your tool implementations
from mcp.tools import (
    add_task_tool,
    update_task_tool,
    suggest_focus_task_tool,
    get_task_list_tool,
    get_context_tool
)

# Create MCP server instance
app = Server("memento-task-intelligence")

# Register tools
@app.list_tools()
async def list_tools() -> list[Tool]:
    """Return list of available tools to the agent"""
    return [
        add_task_tool.schema,
        update_task_tool.schema,
        suggest_focus_task_tool.schema,
        get_task_list_tool.schema,
        get_context_tool.schema
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Execute a tool call from the agent"""
    
    # Route to appropriate tool handler
    if name == "add_task":
        result = await add_task_tool.execute(arguments)
    elif name == "update_task":
        result = await update_task_tool.execute(arguments)
    elif name == "suggest_focus_task":
        result = await suggest_focus_task_tool.execute(arguments)
    elif name == "get_task_list":
        result = await get_task_list_tool.execute(arguments)
    elif name == "get_context":
        result = await get_context_tool.execute(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")
    
    # Return result as TextContent
    return [TextContent(type="text", text=str(result))]

async def main():
    """Run MCP server with stdio transport"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 3: Define Tool Schema (`mcp/tools/add_task.py`)

```python
"""
Add Task Tool - Creates new tasks from any input source
"""
from mcp.types import Tool
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import json

# Define tool parameters with Pydantic
class AddTaskParams(BaseModel):
    title: str = Field(..., description="Task title (required)")
    description: Optional[str] = Field(None, description="Detailed description")
    source: Literal["notification", "voice", "chat", "note", "manual"] = Field(
        ..., description="Input source"
    )
    source_app: Optional[str] = Field(None, description="Source app name (e.g., 'WhatsApp')")
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = Field(None)
    category: Optional[Literal["work", "personal", "social", "finance", "health", "other"]] = Field(None)
    due_date: Optional[str] = Field(None, description="ISO8601 datetime")
    location_context: Optional[str] = Field(None, description="Location hint (e.g., 'home', 'office')")
    weather_context: Optional[str] = Field(None, description="Weather hint (e.g., 'sunny', 'rainy')")
    tags: Optional[list[str]] = Field(None, description="Tags like ['#shopping', '@home']")

# Define tool schema for agent discovery
schema = Tool(
    name="add_task",
    description="Create a new task from user input (notification, voice, chat, or note). Use this when user mentions something they need to do.",
    inputSchema=AddTaskParams.schema()
)

async def execute(arguments: dict) -> dict:
    """Execute the add_task tool"""
    # Validate parameters
    params = AddTaskParams(**arguments)
    
    # Import here to avoid circular dependencies
    from services.task_service import TaskService
    from database.connection import get_db_session
    
    # Get database session
    async with get_db_session() as session:
        task_service = TaskService(session)
        
        # Create task in database
        task = await task_service.create_task(
            title=params.title,
            description=params.description,
            source=params.source,
            source_app=params.source_app,
            priority=params.priority,
            category=params.category,
            due_date=params.due_date,
            location_context=params.location_context,
            weather_context=params.weather_context,
            tags=params.tags
        )
        
        # Return created task as JSON
        return {
            "status": "success",
            "action": "task_created",
            "task": {
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "category": task.category,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "created_at": task.created_at.isoformat()
            }
        }
```

### Step 4: Implement Update Task Tool (`mcp/tools/update_task.py`)

```python
"""
Update Task Tool - Modifies existing tasks with audit trail
"""
from mcp.types import Tool
from pydantic import BaseModel, Field
from typing import Optional, Literal

class UpdateTaskParams(BaseModel):
    task_id: str = Field(..., description="Task ID to update (required)")
    title: Optional[str] = Field(None, description="New title")
    description: Optional[str] = Field(None, description="New description")
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = Field(None)
    category: Optional[Literal["work", "personal", "social", "finance", "health", "other"]] = Field(None)
    due_date: Optional[str] = Field(None, description="New due date (ISO8601)")
    location_context: Optional[str] = Field(None)
    weather_context: Optional[str] = Field(None)
    tags: Optional[list[str]] = Field(None)
    status: Optional[Literal["pending", "in_progress", "completed"]] = Field(None)
    update_reason: str = Field(..., description="Reason for update (required for audit trail)")

schema = Tool(
    name="update_task",
    description="Update an existing task when new information arrives. Example: 'Don't buy milk, buy eggs instead' should update the existing milk task. Always provide update_reason.",
    inputSchema=UpdateTaskParams.schema()
)

async def execute(arguments: dict) -> dict:
    """Execute the update_task tool"""
    params = UpdateTaskParams(**arguments)
    
    from services.task_service import TaskService
    from database.connection import get_db_session
    
    async with get_db_session() as session:
        task_service = TaskService(session)
        
        # Update task with audit trail
        task = await task_service.update_task(
            task_id=params.task_id,
            update_reason=params.update_reason,
            **params.dict(exclude={'task_id', 'update_reason'}, exclude_none=True)
        )
        
        return {
            "status": "success",
            "action": "task_updated",
            "task": {
                "task_id": task.id,
                "title": task.title,
                "update_reason": params.update_reason,
                "updated_at": task.updated_at.isoformat()
            }
        }
```

### Step 5: Implement Suggest Focus Task (`mcp/tools/suggest_task.py`)

```python
"""
Suggest Focus Task Tool - Returns THE ONE best task for current context
"""
from mcp.types import Tool
from pydantic import BaseModel, Field
from typing import Optional, Literal

class SuggestFocusTaskParams(BaseModel):
    user_location: Optional[Literal["home", "office", "commute", "other"]] = Field(None)
    current_weather: Optional[Literal["sunny", "rainy", "snowy", "cloudy"]] = Field(None)
    time_of_day: Optional[Literal["morning", "afternoon", "evening", "night"]] = Field(None)
    user_energy_level: Optional[Literal["high", "medium", "low"]] = Field(None)
    available_time_minutes: Optional[int] = Field(None, description="How much time user has")
    current_date_time: Optional[str] = Field(None, description="Current timestamp (ISO8601)")

schema = Tool(
    name="suggest_focus_task",
    description="Analyze all pending tasks and suggest THE ONE task that best fits the current context (location, weather, time, energy). Returns a single focused recommendation.",
    inputSchema=SuggestFocusTaskParams.schema()
)

async def execute(arguments: dict) -> dict:
    """Execute the suggest_focus_task tool"""
    params = SuggestFocusTaskParams(**arguments)
    
    from services.task_service import TaskService
    from services.context_service import ContextService
    from database.connection import get_db_session
    
    async with get_db_session() as session:
        task_service = TaskService(session)
        context_service = ContextService()
        
        # Get all pending tasks
        pending_tasks = await task_service.get_tasks(status="pending")
        
        # Apply hard filters (eliminate impossible tasks)
        filtered_tasks = context_service.apply_hard_filters(
            tasks=pending_tasks,
            weather=params.current_weather,
            location=params.user_location,
            time_of_day=params.time_of_day,
            available_time=params.available_time_minutes
        )
        
        # Apply soft ranking (AI-powered prioritization)
        ranked_tasks = context_service.rank_tasks(
            tasks=filtered_tasks,
            energy_level=params.user_energy_level,
            current_time=params.current_date_time
        )
        
        # Get the top task
        if ranked_tasks:
            best_task = ranked_tasks[0]
            return {
                "status": "success",
                "suggested_task": {
                    "task_id": best_task["task"].id,
                    "title": best_task["task"].title,
                    "description": best_task["task"].description,
                    "reason": best_task["reason"],
                    "confidence_score": best_task["confidence"]
                },
                "context_summary": {
                    "filtered_out_count": len(pending_tasks) - len(filtered_tasks),
                    "rationale": best_task["rationale"]
                }
            }
        else:
            return {
                "status": "success",
                "suggested_task": None,
                "context_summary": {
                    "filtered_out_count": len(pending_tasks),
                    "rationale": "No tasks match current context"
                }
            }
```

### Step 6: Azure SQL Connection (`database/connection.py`)

```python
"""
Azure SQL Database connection with SQLAlchemy
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# Azure SQL connection string
# Format: mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+18+for+SQL+Server
DATABASE_URL = os.getenv("AZURE_SQL_CONNECTION_STRING")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Log SQL queries (disable in production)
    future=True
)

# Create session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@asynccontextmanager
async def get_db_session():
    """Get database session with automatic cleanup"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Step 7: Running the MCP Server

**Option A: Standalone MCP Server (for Azure AI Foundry)**
```bash
# Run MCP server in stdio mode
python mcp_server.py
```

**Option B: Embedded in FastAPI (for local development)**
```python
# main.py
from fastapi import FastAPI
import subprocess
import sys

app = FastAPI()

# REST API endpoints for mobile app
@app.post("/api/ingest/notification")
async def ingest_notification(payload: dict):
    # Process notification and interact with database
    pass

# Start MCP server as subprocess when needed
def start_mcp_server():
    return subprocess.Popen(
        [sys.executable, "mcp_server.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
```

### Step 8: Azure AI Foundry Agent Configuration

In Azure AI Foundry portal:

1. **Create Agent**:
   - Name: "Memento Task Assistant"
   - Model: GPT-4o
   - System Prompt: "You are a task management assistant. You help users manage tasks intelligently based on context. Never delete tasks - only add or update them."

2. **Connect MCP Server**:
   - Transport: stdio
   - Command: `python mcp_server.py`
   - Working Directory: `/path/to/backend`

3. **Environment Variables**:
   ```
   AZURE_SQL_CONNECTION_STRING=mssql+pyodbc://...
   AZURE_MAPS_API_KEY=your_key
   ```

4. **Test Agent**:
   - Send test message: "Remind me to buy milk"
   - Agent should call `add_task` tool
   - Verify task appears in Azure SQL database

## 🔧 MCP Tools Exposed to AI Agent

The MCP server exposes these tools that the AI agent can call. Each tool has strict validation and the "no delete" rule is enforced at the server level.

### 1. `add_task` - Create New Tasks
**Purpose:** Add a new task from any input source (notification, voice, chat, note).

**Parameters:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "source": "notification|voice|chat|note|manual",
  "source_app": "string (optional, e.g., 'WhatsApp', 'Gmail')",
  "priority": "low|medium|high|urgent (optional)",
  "category": "work|personal|social|finance|health|other (optional)",
  "due_date": "ISO8601 datetime (optional)",
  "location_context": "string (optional, e.g., 'home', 'office', 'grocery store')",
  "weather_context": "string (optional, e.g., 'sunny', 'rainy')",
  "tags": "array of strings (optional, e.g., ['#shopping', '@home'])"
}
```

**Returns:** Created task object with `task_id`.

**Examples:**
- Notification: "Bill due tomorrow" → `add_task(title="Pay electricity bill", due_date="2025-12-07", category="finance")`
- Voice: "Remind me to buy milk" → `add_task(title="Buy milk", source="voice", category="personal", location_context="grocery store")`
- Chat: "I need to call mom" → `add_task(title="Call mom", source="chat", category="personal")`

### 2. `update_task` - Modify Existing Tasks
**Purpose:** Update task details when new information arrives or context changes.

**Parameters:**
```json
{
  "task_id": "string (required)",
  "title": "string (optional)",
  "description": "string (optional)",
  "priority": "low|medium|high|urgent (optional)",
  "category": "work|personal|social|finance|health|other (optional)",
  "due_date": "ISO8601 datetime (optional)",
  "location_context": "string (optional)",
  "weather_context": "string (optional)",
  "tags": "array of strings (optional)",
  "status": "pending|in_progress|completed (optional)",
  "update_reason": "string (required, for audit trail)"
}
```

**Returns:** Updated task object.

**Examples:**
- "Don't buy milk, buy eggs instead" → `update_task(task_id="123", title="Buy eggs", update_reason="User changed request")`
- "Actually the bill is due next week" → `update_task(task_id="456", due_date="2025-12-13", update_reason="Corrected due date")`
- Mark complete via chat → `update_task(task_id="789", status="completed", update_reason="User confirmed completion")`

### 3. `suggest_focus_task` - Get Best Task for Current Moment
**Purpose:** Analyze all pending tasks and suggest THE ONE task that fits current context.

**Parameters:**
```json
{
  "user_location": "home|office|commute|other (optional)",
  "current_weather": "sunny|rainy|snowy|cloudy (optional)",
  "time_of_day": "morning|afternoon|evening|night (optional)",
  "user_energy_level": "high|medium|low (optional)",
  "available_time_minutes": "integer (optional, e.g., 15, 60, 120)",
  "current_date_time": "ISO8601 datetime (optional, defaults to now)"
}
```

**Returns:**
```json
{
  "suggested_task": {
    "task_id": "string",
    "title": "string",
    "reason": "string (why this task is best right now)",
    "confidence_score": "float (0-100)"
  },
  "context_summary": {
    "filtered_out_count": "integer (tasks that don't fit context)",
    "rationale": "string (explanation of filtering logic)"
  }
}
```

**Logic:**
1. **Hard Filters** (Eliminate impossible tasks):
   - Weather: Skip "Mow lawn" if raining, skip "Go to beach" if snowing
   - Location: Skip "Work tasks" if at home after hours, skip "Home chores" if at office
   - Time: Skip "Call mom" if it's 3 AM, skip "Grocery shopping" if stores closed
   - Duration: Skip long tasks if only 15 minutes available

2. **Soft Ranking** (AI-powered prioritization):
   - Due date urgency
   - Task priority level
   - Energy level match (high-energy tasks for morning, low-energy for evening)
   - Context fit score
   - User's historical patterns (if available)

3. **Confidence Scoring:**
   - 90-100: Perfect match (urgent + context fits perfectly)
   - 70-89: Strong match (due soon + reasonable context)
   - 50-69: Acceptable match (makes sense but not urgent)
   - <50: Weak match (better options probably exist)

**Examples:**
- Morning at home, sunny weather → Suggests "Do laundry" (not "Work presentation")
- Evening, low energy, at home → Suggests "Read book chapter" (not "Gym session")
- Rainy day, any location → Suggests "Pay bills online" (not "Mow lawn")

### 4. `get_task_list` - Retrieve Tasks with Filters
**Purpose:** Query tasks for UI display or agent analysis.

**Parameters:**
```json
{
  "status": "pending|in_progress|completed|all (optional, default: 'pending')",
  "category": "work|personal|social|finance|health|other (optional)",
  "due_before": "ISO8601 datetime (optional)",
  "due_after": "ISO8601 datetime (optional)",
  "priority": "low|medium|high|urgent (optional)",
  "search_query": "string (optional, searches title/description)",
  "limit": "integer (optional, default: 50)",
  "offset": "integer (optional, for pagination)"
}
```

**Returns:** Array of task objects matching filters.

### 5. `get_context` - Retrieve Current User Context
**Purpose:** Allow AI agent to query current context for decision-making.

**Parameters:**
```json
{
  "include_weather": "boolean (optional, default: true)",
  "include_calendar": "boolean (optional, default: true)",
  "include_location": "boolean (optional, default: true)"
}
```

**Returns:**
```json
{
  "timestamp": "ISO8601 datetime",
  "location": {
    "type": "home|office|commute|other",
    "coordinates": "lat,lon (if available)"
  },
  "weather": {
    "condition": "sunny|rainy|snowy|cloudy",
    "temperature": "integer (Celsius)",
    "description": "string"
  },
  "time_context": {
    "time_of_day": "morning|afternoon|evening|night",
    "day_of_week": "Monday|Tuesday|...",
    "is_weekend": "boolean"
  },
  "calendar": {
    "next_event": "object (if available)",
    "free_until": "ISO8601 datetime (optional)"
  }
}
```

### 🚫 Explicitly NOT Included: `delete_task`
**The AI agent CANNOT delete tasks.** This is a core design principle:
- Deletion is a destructive action that should require explicit user intent
- Tasks are soft-deleted (marked as archived) via UI only
- Preserves user agency and prevents accidental data loss
- Maintains full audit trail for all task history

## 🧩 System Components

### 1. MCP Server Core
*   **Purpose:** Implement Model Context Protocol for AI agent integration.
*   **Endpoints:**
    *   `POST /mcp/tools` - List available tools (MCP discovery)
    *   `POST /mcp/execute` - Execute a tool call from AI agent
    *   `GET /mcp/schema` - Get tool schemas for agent configuration
*   **Implementation:**
    *   FastAPI with Pydantic models for strict type validation
    *   Tool registry pattern for easy extensibility
    *   Request/response logging for debugging and analytics

### 2. Task Management Engine
*   **Purpose:** CRUD operations with audit trails and "no delete" enforcement.
*   **Database Schema:**
    *   `tasks` table - Main task storage
    *   `task_history` table - Full audit trail of all changes
    *   `task_contexts` table - Associated context snapshots
*   **Rules:**
    *   ✅ CREATE: Always allowed via `add_task` tool
    *   ✅ UPDATE: Always allowed via `update_task` tool (with reason tracking)
    *   ✅ SOFT DELETE: Mark as archived (status='archived'), never hard delete
    *   ❌ HARD DELETE: Blocked at database level (no tool provided to AI)

### 3. Context Manager
*   **Purpose:** Maintain real-time snapshot of user's environment.
*   **Endpoints:**
    *   `POST /context/update` - Mobile app pushes context updates
    *   `GET /context/current` - Retrieve latest context (used by `get_context` tool)
*   **Data Sources:**
    *   Mobile GPS → Location type inference (home/office/other)
    *   Azure Maps API → Current weather conditions
    *   Device clock → Time of day, day of week
    *   Microsoft Graph API → Calendar availability (optional)
    *   Device sensors → Battery, activity level (optional)

### 4. AI Agent Interface
*   **Purpose:** Bridge between MCP tools and Azure OpenAI.
*   **Implementation:**
    *   LangChain agent with custom MCP tool integration
    *   System prompt defines agent behavior and constraints
    *   Function calling for structured tool invocation
    *   Response parsing and validation
*   **Safety Features:**
    *   Tool whitelist (only approved tools accessible)
    *   Parameter validation before execution
    *   Rate limiting on tool calls
    *   Audit logging of all AI decisions

## 📅 Implementation Roadmap (Azure Architecture)

### Phase 1: Azure Setup & Database (Week 1)
**Goal:** Provision Azure resources and set up database schema.

**Tasks:**
- [ ] **Azure Account Setup:**
  - [ ] Create Azure account (student credits or free tier)
  - [ ] Create resource group for Memento project
  - [ ] Set up Azure SQL Database (Basic or Standard tier)
  - [ ] Configure firewall rules for local development access
  
- [ ] **Database Schema Design:**
  - [ ] Design `tasks` table schema
    ```sql
    CREATE TABLE tasks (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        title NVARCHAR(500) NOT NULL,
        description NVARCHAR(MAX),
        status NVARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, archived
        priority NVARCHAR(20), -- low, medium, high, urgent
        category NVARCHAR(50), -- work, personal, social, finance, health, other
        source NVARCHAR(50), -- notification, voice, chat, note, manual
        source_app NVARCHAR(100),
        due_date DATETIME2,
        location_context NVARCHAR(100),
        weather_context NVARCHAR(50),
        tags NVARCHAR(MAX), -- JSON array
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        is_deleted BIT DEFAULT 0 -- soft delete flag
    );
    ```
  - [ ] Design `task_history` table (audit trail)
  - [ ] Design `task_contexts` table (context snapshots)
  - [ ] Design `user_contexts` table (current user state)
  
- [ ] **SQLAlchemy Models:**
  - [x] Initialize FastAPI project structure
  - [ ] Create SQLAlchemy models for all tables
  - [ ] Set up Alembic for migrations
  - [ ] Test connection to Azure SQL from local machine
  - [ ] Create initial migration and apply to database

**Deliverable:** Azure SQL database with schema, SQLAlchemy models working locally.

---

### Phase 2: Custom MCP Server Core (Week 2)
**Goal:** Implement MCP protocol with stdio transport.

**Tasks:**
- [ ] **MCP SDK Setup:**
  - [ ] Install `mcp` Python package
  - [ ] Study MCP protocol specification
  - [ ] Create `mcp/` directory structure
  - [ ] Set up `mcp_server.py` entry point
  
- [ ] **Tool Registry Pattern:**
  - [ ] Create base tool interface
  - [ ] Implement tool discovery mechanism
  - [ ] Create tool schema generator using Pydantic
  - [ ] Add tool registration decorator pattern
  
- [ ] **MCP Server Implementation:**
  - [ ] Implement `list_tools()` handler
  - [ ] Implement `call_tool()` router
  - [ ] Add parameter validation with Pydantic
  - [ ] Add error handling and logging
  - [ ] Test stdio communication manually
  
- [ ] **Testing Infrastructure:**
  - [ ] Set up pytest with async support
  - [ ] Create mock database fixtures
  - [ ] Write unit tests for MCP core
  - [ ] Test JSON-RPC message format

**Deliverable:** Working MCP server that can communicate via stdio and register tools.

---

### Phase 3: Core MCP Tools Implementation (Week 2-3)
**Goal:** Implement all 5 task management tools.

**Tasks:**
- [ ] **Tool 1: `add_task`**
  - [ ] Define Pydantic schema for parameters
  - [ ] Implement database insertion logic
  - [ ] Generate UUID for task_id
  - [ ] Store metadata (source, source_app, timestamps)
  - [ ] Return structured JSON response
  - [ ] Unit tests with various input scenarios
  
- [ ] **Tool 2: `update_task`**
  - [ ] Define update parameters schema
  - [ ] Validate task exists before update
  - [ ] Create audit trail entry in `task_history`
  - [ ] Implement partial update (only modified fields)
  - [ ] Enforce `update_reason` requirement
  - [ ] Block updates to archived tasks
  - [ ] Unit tests for update scenarios
  
- [ ] **Tool 3: `suggest_focus_task`**
  - [ ] Define context parameters schema
  - [ ] Implement hard filter functions:
    - [ ] Weather filter (outdoor tasks in rain)
    - [ ] Location filter (work tasks at home)
    - [ ] Time filter (no calls at 3 AM)
    - [ ] Duration filter (long tasks vs short time)
  - [ ] Implement soft ranking algorithm:
    - [ ] Due date urgency scoring
    - [ ] Priority weighting
    - [ ] Energy level matching
    - [ ] Context fit calculation
  - [ ] Calculate confidence scores (0-100)
  - [ ] Return single best task with explanation
  - [ ] Unit tests with mock contexts
  
- [ ] **Tool 4: `get_task_list`**
  - [ ] Define filter parameters
  - [ ] Implement SQLAlchemy queries with filters
  - [ ] Add full-text search (title/description)
  - [ ] Implement pagination (limit/offset)
  - [ ] Add sorting options
  - [ ] Unit tests for various filters
  
- [ ] **Tool 5: `get_context`**
  - [ ] Define context retrieval parameters
  - [ ] Query latest user context from database
  - [ ] Format response with optional fields
  - [ ] Implement caching (5-minute TTL)
  - [ ] Unit tests
  
- [ ] **"No Delete" Enforcement:**
  - [ ] Verify no delete tool exists
  - [ ] Add database trigger to prevent hard deletes
  - [ ] Document constraint in code comments
  - [ ] Add integration test verifying constraint

**Deliverable:** All 5 MCP tools working with >80% test coverage.

---

### Phase 4: Azure AI Foundry Integration (Week 3-4)
**Goal:** Connect agent to custom MCP server.

**Tasks:**
- [ ] **Azure AI Foundry Setup:**
  - [ ] Navigate to Azure AI Foundry portal
  - [ ] Create new agent project
  - [ ] Select GPT-4o model
  - [ ] Configure agent system prompt
  
- [ ] **MCP Server Connection:**
  - [ ] Configure stdio transport in agent settings
  - [ ] Set MCP server command: `python mcp_server.py`
  - [ ] Set working directory to backend folder
  - [ ] Add environment variables for connection strings
  
- [ ] **Agent System Prompt:**
  ```
  You are a helpful task management assistant for Memento app.
  
  Your role:
  - Help users create and update tasks from various inputs (notifications, chat, voice)
  - Suggest the best task to focus on based on current context
  - NEVER delete tasks - users control deletion via UI
  - Update tasks when new information arrives (e.g., "buy eggs instead of milk")
  
  Context awareness:
  - Consider location, weather, time of day, and energy level
  - Filter out impossible tasks (outdoor work in rain, calls at night)
  - Prioritize urgent and important tasks
  
  Communication style:
  - Be concise and helpful
  - Explain why you suggest a particular task
  - Ask clarifying questions when input is ambiguous
  ```
  
- [ ] **Testing Agent Connection:**
  - [ ] Test agent can discover tools
  - [ ] Test simple "add milk" command
  - [ ] Test "buy eggs instead" update
  - [ ] Test context-aware suggestion
  - [ ] Verify tasks appear in Azure SQL database
  
- [ ] **Error Handling:**
  - [ ] Handle MCP server crashes gracefully
  - [ ] Add retry logic for database connections
  - [ ] Log all agent-tool interactions
  - [ ] Add timeout handling

**Deliverable:** Azure AI Foundry agent successfully calling MCP tools.

---

### Phase 5: Context Services & Azure APIs (Week 4)
**Goal:** Enrich tasks with external context data.

**Tasks:**
- [ ] **Azure Maps Integration:**
  - [ ] Get Azure Maps API subscription key
  - [ ] Implement weather API client (`services/azure_maps.py`)
  - [ ] Cache weather data (15-minute TTL)
  - [ ] Handle API rate limits and errors
  - [ ] Store weather context with tasks
  
- [ ] **Context Service Implementation:**
  - [ ] Create `services/context_service.py`
  - [ ] Implement hard filter logic:
    - [ ] `filter_by_weather(tasks, weather)`
    - [ ] `filter_by_location(tasks, location)`
    - [ ] `filter_by_time(tasks, time_of_day)`
    - [ ] `filter_by_duration(tasks, available_minutes)`
  - [ ] Implement soft ranking:
    - [ ] `calculate_urgency_score(task)`
    - [ ] `calculate_context_fit(task, context)`
    - [ ] `rank_tasks(tasks, context)`
  - [ ] Unit tests for all filter functions
  
- [ ] **Microsoft Graph (Optional):**
  - [ ] Set up OAuth2 app registration
  - [ ] Implement calendar access
  - [ ] Check free/busy status
  - [ ] Store calendar context
  - [ ] Make opt-in for users
  
- [ ] **Context Update Endpoint:**
  - [ ] Create `POST /api/context/update` REST endpoint
  - [ ] Accept context from mobile app
  - [ ] Store in `user_contexts` table
  - [ ] Return acknowledgment

**Deliverable:** Context-aware suggestion working with real weather data.

---

### Phase 6: Input Processing Pipelines (Week 4-5)
**Goal:** Handle different input sources from mobile app.

**Tasks:**
- [ ] **REST API Layer (`main.py`):**
  - [ ] Create FastAPI app
  - [ ] Define Pydantic models for requests/responses
  - [ ] Add CORS middleware for mobile app
  - [ ] Add request logging
  
- [ ] **Notification Pipeline:**
  - [ ] `POST /api/ingest/notification` endpoint
  - [ ] Parse notification metadata
  - [ ] Call Azure AI Foundry agent with notification text
  - [ ] Agent decides: add_task or update_task or ignore
  - [ ] Return response to mobile app
  
- [ ] **Chat Pipeline:**
  - [ ] `POST /api/ingest/chat` endpoint
  - [ ] Support conversational context (message history)
  - [ ] Agent interprets intent
  - [ ] Agent calls appropriate MCP tools
  - [ ] Return natural language response
  
- [ ] **Voice Pipeline (Optional):**
  - [ ] `POST /api/ingest/voice` endpoint
  - [ ] Accept audio blob (base64)
  - [ ] Transcribe with Azure Speech or local Whisper
  - [ ] Pass to chat pipeline
  - [ ] Return transcription + action
  
- [ ] **Note Pipeline:**
  - [ ] `POST /api/ingest/note` endpoint
  - [ ] Handle multi-line freeform text
  - [ ] Agent extracts multiple tasks if present
  - [ ] Batch create tasks
  - [ ] Return summary
  
- [ ] **Update Detection Logic:**
  - [ ] Implement similarity search (simple string matching first)
  - [ ] Find related existing tasks
  - [ ] Agent decides: new task vs update
  - [ ] Prompt engineering for update detection
  - [ ] Test with "milk → eggs" scenario

**Deliverable:** All input sources can create/update tasks via agent.

---

### Phase 7: Mobile App Integration (Week 5)
**Goal:** Connect mobile app to backend API.

**Tasks:**
- [ ] **Update CloudConnector (`mobile/src/services/CloudConnector.ts`):**
  - [ ] Update `CLOUD_URL` to point to backend
  - [ ] Add new endpoints: `/api/ingest/chat`, `/api/tasks/focus`
  - [ ] Add error handling for offline mode
  - [ ] Add retry logic with exponential backoff
  
- [ ] **HomePage Integration:**
  - [ ] Call `/api/tasks/focus` on page load
  - [ ] Pass current context (location, weather, time)
  - [ ] Display suggested task prominently
  - [ ] Show "why this task" explanation
  - [ ] Add "Not now" button (snooze logic)
  
- [ ] **ChatBoxPage Integration:**
  - [ ] Send messages to `/api/ingest/chat`
  - [ ] Display agent responses
  - [ ] Show task creation confirmations
  - [ ] Handle multi-turn conversations
  
- [ ] **TasksPage Integration:**
  - [ ] Call `/api/tasks` with filters
  - [ ] Display timeline view
  - [ ] Add search functionality
  - [ ] Manual task creation via UI
  
- [ ] **Context Updates:**
  - [ ] Send context to `/api/context/update` every 15 minutes
  - [ ] Include GPS location, battery, time
  - [ ] Fetch weather from device or backend

**Deliverable:** End-to-end mobile → backend → agent → database flow working.

---

### Phase 8: Polish & Demo Prep (Week 5-6)
**Goal:** Production-ready demo system.

**Tasks:**
- [ ] **Error Handling:**
  - [ ] Graceful degradation when Azure services fail
  - [ ] Offline mode with local queue
  - [ ] User-friendly error messages
  - [ ] Retry logic for transient failures
  
- [ ] **Performance:**
  - [ ] Add database indexes (task status, due_date, created_at)
  - [ ] Implement query result caching
  - [ ] Optimize MCP tool execution time (<500ms)
  - [ ] Load test with 100 concurrent users
  
- [ ] **Logging & Monitoring:**
  - [ ] Comprehensive logging (Python logging module)
  - [ ] Log all MCP tool calls with parameters
  - [ ] Log agent decisions and reasoning
  - [ ] (Optional) Integrate Azure Application Insights
  
- [ ] **Security:**
  - [ ] Store connection strings in Azure Key Vault (production)
  - [ ] Use environment variables for local dev
  - [ ] Add API authentication (JWT tokens)
  - [ ] Validate all user inputs
  - [ ] SQL injection prevention (SQLAlchemy ORM)
  
- [ ] **Demo Scenarios:**
  - [ ] Scenario 1: Notification "Bill due" → Task created
  - [ ] Scenario 2: Chat "Buy milk" then "Buy eggs instead" → Task updated
  - [ ] Scenario 3: Rainy day → Outdoor task filtered out, indoor task suggested
  - [ ] Scenario 4: Morning vs evening → Different energy-level tasks
  - [ ] Scenario 5: Chat conversation creating multiple tasks
  
- [ ] **Documentation:**
  - [ ] API documentation (FastAPI auto-generated Swagger)
  - [ ] MCP tool documentation (this README)
  - [ ] Setup guide for judges/reviewers
  - [ ] Architecture diagram
  - [ ] Demo script with sample data
  
- [ ] **Testing:**
  - [ ] Integration tests (end-to-end flows)
  - [ ] MCP server stress test
  - [ ] Edge case testing (empty database, network failures)
  - [ ] User acceptance testing with real scenarios

**Deliverable:** Polished, demo-ready system with full documentation.

---

### Phase 9: Optional Enhancements (Post-Demo)
**Goal:** Future features and improvements.

**Ideas:**
- [ ] **Azure Deployment:**
  - [ ] Deploy FastAPI to Azure App Service
  - [ ] Configure Azure AI Foundry for production
  - [ ] Set up CI/CD with GitHub Actions
  - [ ] Monitor with Application Insights
  
- [ ] **Advanced Context:**
  - [ ] Traffic/commute time (Azure Maps)
  - [ ] Social context (calendar events with attendees)
  - [ ] Device context (battery, connectivity, activity)
  
- [ ] **Learning & Personalization:**
  - [ ] Track which suggestions user accepts/rejects
  - [ ] Fine-tune ranking algorithm per user
  - [ ] Store user preferences
  
- [ ] **Collaboration:**
  - [ ] Shared tasks with family/team
  - [ ] Task delegation
  - [ ] Real-time sync with SignalR
  
- [ ] **Additional Integrations:**
  - [ ] Email parsing (Graph API)
  - [ ] SMS reminders (Twilio)
  - [ ] Smart home (Alexa/Google Home)

**Deliverable:** Roadmap for production version.

### Phase 1: Foundation & Database (Week 1)
**Goal:** Set up local environment and core data models.

**Tasks:**
- [x] Initialize FastAPI project structure
- [x] Create `LocalIntelligence` service on Mobile
- [ ] Set up local PostgreSQL database with Docker
- [ ] Design database schema:
  - [ ] `tasks` table (id, title, description, status, priority, category, source, created_at, updated_at)
  - [ ] `task_history` table (task_id, change_type, old_value, new_value, reason, changed_at)
  - [ ] `task_contexts` table (task_id, location, weather, time_of_day, snapshot_at)
  - [ ] `user_contexts` table (user_id, location, weather, calendar, timestamp)
- [ ] Implement SQLAlchemy models with relationships
- [ ] Set up Alembic for database migrations
- [ ] Create `.env` file template for configuration
- [ ] Add soft delete functionality (archived status)

**Deliverable:** Working database with models and migrations.

---

### Phase 2: MCP Server Core (Week 2)
**Goal:** Implement MCP protocol and tool registry.

**Tasks:**
- [ ] Research Model Context Protocol specification
- [ ] Design tool registry pattern:
  - [ ] Base `MCPTool` abstract class
  - [ ] Tool registration decorator
  - [ ] Tool schema generator (JSON Schema)
- [ ] Implement MCP endpoints:
  - [ ] `POST /mcp/tools` - Tool discovery
  - [ ] `POST /mcp/execute` - Tool execution
  - [ ] `GET /mcp/schema` - Schema retrieval
- [ ] Create Pydantic models for all tool parameters
- [ ] Add request/response validation
- [ ] Implement tool execution engine with error handling
- [ ] Add logging and debugging utilities
- [ ] Write unit tests for MCP core functionality

**Deliverable:** Working MCP server that can register and execute tools.

---

### Phase 3: Task Management Tools (Week 2-3)
**Goal:** Implement the 5 core MCP tools.

**Tasks:**
- [ ] **Tool 1: `add_task`**
  - [ ] Parameter validation (title required, optional fields)
  - [ ] Database insertion with timestamp
  - [ ] Auto-generate task_id (UUID)
  - [ ] Store source metadata
  - [ ] Return created task object
  - [ ] Unit tests for edge cases

- [ ] **Tool 2: `update_task`**
  - [ ] Task existence validation
  - [ ] Create history entry before update
  - [ ] Update only provided fields (partial update)
  - [ ] Require `update_reason` for audit trail
  - [ ] Block updates to archived tasks
  - [ ] Unit tests for update scenarios

- [ ] **Tool 3: `suggest_focus_task`**
  - [ ] Implement hard filters:
    - [ ] Weather-based filtering
    - [ ] Location-based filtering
    - [ ] Time-based filtering
    - [ ] Duration-based filtering
  - [ ] Implement soft ranking algorithm:
    - [ ] Due date urgency scoring
    - [ ] Priority level weighting
    - [ ] Energy level matching
    - [ ] Context fit calculation
  - [ ] Calculate confidence scores
  - [ ] Return single best task with explanation
  - [ ] Unit tests with mock contexts

- [ ] **Tool 4: `get_task_list`**
  - [ ] Implement filter logic (status, category, date range)
  - [ ] Add search functionality (title/description)
  - [ ] Add pagination support
  - [ ] Optimize query performance (indexes)
  - [ ] Unit tests for filters

- [ ] **Tool 5: `get_context`**
  - [ ] Retrieve latest context from database
  - [ ] Format response with optional fields
  - [ ] Cache context for 5 minutes (reduce API calls)
  - [ ] Unit tests for context retrieval

- [ ] **Enforce "No Delete" rule:**
  - [ ] Remove any delete functionality from codebase
  - [ ] Add database constraint preventing hard deletes
  - [ ] Document why this constraint exists

**Deliverable:** All 5 MCP tools working with full test coverage.

---

### Phase 4: Azure Integration (Week 3-4)
**Goal:** Connect to Azure services for AI and context.

**Tasks:**
- [ ] **Azure Account Setup:**
  - [ ] Create Azure account (use free credits)
  - [ ] Provision Azure OpenAI Service
  - [ ] Deploy GPT-4o model
  - [ ] Get API keys and endpoints
  - [ ] Add to `.env` file

- [ ] **Azure OpenAI Integration:**
  - [ ] Install `openai` Python SDK
  - [ ] Create LangChain agent with function calling
  - [ ] Define system prompt for agent behavior:
    - [ ] "You are a task management assistant"
    - [ ] "You can add and update tasks, never delete"
    - [ ] "Suggest the best task based on context"
  - [ ] Register MCP tools as LangChain functions
  - [ ] Test function calling with sample inputs
  - [ ] Add retry logic for API failures

- [ ] **Azure Maps Integration:**
  - [ ] Get Azure Maps API key
  - [ ] Implement weather data fetching
  - [ ] Implement traffic data fetching (optional)
  - [ ] Cache weather data (15-minute TTL)
  - [ ] Handle API errors gracefully

- [ ] **Microsoft Graph Integration (Optional):**
  - [ ] Set up OAuth2 flow for calendar access
  - [ ] Implement calendar availability check
  - [ ] Store refresh tokens securely
  - [ ] Make calendar integration opt-in

**Deliverable:** AI agent can call MCP tools, context enriched with Azure data.

---

### Phase 5: Input Processing Pipelines (Week 4)
**Goal:** Handle different input sources (notifications, voice, chat, notes).

**Tasks:**
- [ ] **Notification Pipeline:**
  - [ ] Endpoint: `POST /ingest/notification`
  - [ ] Receive notification metadata (app, title, body)
  - [ ] Call Azure OpenAI to parse notification
  - [ ] Agent decides: add_task or ignore
  - [ ] Return response to mobile app

- [ ] **Chat Pipeline:**
  - [ ] Endpoint: `POST /ingest/chat`
  - [ ] Support conversational input
  - [ ] Agent interprets intent (add/update/query)
  - [ ] Call appropriate MCP tools
  - [ ] Return natural language response

- [ ] **Voice Pipeline (Optional for demo):**
  - [ ] Endpoint: `POST /ingest/voice`
  - [ ] Receive audio blob
  - [ ] Transcribe with Azure AI Speech (or local Whisper)
  - [ ] Pass to chat pipeline
  - [ ] Return transcription + action taken

- [ ] **Note Pipeline:**
  - [ ] Endpoint: `POST /ingest/note`
  - [ ] Process freeform text
  - [ ] Extract multiple tasks if present
  - [ ] Batch create tasks
  - [ ] Return summary of created tasks

- [ ] **Update Detection:**
  - [ ] Implement logic to detect task updates:
    - [ ] "Don't buy milk, buy eggs instead"
    - [ ] Find existing related task
    - [ ] Call `update_task` instead of `add_task`
  - [ ] Use semantic similarity (optional: embeddings)
  - [ ] Prompt engineering for update detection

**Deliverable:** All input sources can create/update tasks via AI agent.

---

### Phase 6: Context-Aware Suggestions (Week 5)
**Goal:** Make the "suggest_focus_task" tool production-ready.

**Tasks:**
- [ ] **Context Collection:**
  - [ ] Mobile app sends context updates every 15 minutes
  - [ ] Store in `user_contexts` table
  - [ ] Endpoint: `POST /context/update`

- [ ] **Advanced Filtering Logic:**
  - [ ] Weather rules:
    - [ ] Outdoor tasks require non-rainy weather
    - [ ] Indoor tasks preferred during rain
  - [ ] Location rules:
    - [ ] Home tasks after work hours
    - [ ] Work tasks during office hours
    - [ ] Shopping tasks near stores
  - [ ] Time rules:
    - [ ] No calls late at night
    - [ ] Morning routines in AM
    - [ ] Evening relaxation tasks at night
  - [ ] Energy rules:
    - [ ] High-energy tasks when user is fresh
    - [ ] Low-energy tasks when tired

- [ ] **AI-Powered Ranking:**
  - [ ] Send filtered tasks to Azure OpenAI
  - [ ] Prompt: "Pick the best task for [context]"
  - [ ] Parse confidence score from response
  - [ ] Validate AI choice against hard filters

- [ ] **UI Integration:**
  - [ ] Mobile app calls `suggest_focus_task` on HomePage
  - [ ] Display single task prominently
  - [ ] Show "Why this task?" explanation
  - [ ] Add "Not now" button (snooze logic)

**Deliverable:** Context-aware task suggestion working end-to-end.

---

### Phase 7: Polish & Demo Prep (Week 5-6)
**Goal:** Prepare for hackathon demo and testing.

**Tasks:**
- [ ] **Error Handling:**
  - [ ] Graceful degradation when Azure APIs fail
  - [ ] Offline mode for local intelligence
  - [ ] User-friendly error messages

- [ ] **Performance Optimization:**
  - [ ] Add database indexes
  - [ ] Cache frequent queries
  - [ ] Optimize Azure API calls

- [ ] **Logging & Debugging:**
  - [ ] Comprehensive logging of all MCP calls
  - [ ] AI decision logging for transparency
  - [ ] Performance metrics

- [ ] **Demo Scenarios:**
  - [ ] Scenario 1: Notification → Task creation
  - [ ] Scenario 2: "Buy milk" → "Buy eggs" update
  - [ ] Scenario 3: Rainy day → Outdoor task filtered out
  - [ ] Scenario 4: Chat interaction → Multiple tasks
  - [ ] Scenario 5: Morning vs evening suggestions

- [ ] **Documentation:**
  - [ ] API documentation (Swagger/OpenAPI)
  - [ ] MCP tool documentation
  - [ ] Setup instructions for judges
  - [ ] Demo script with sample data

- [ ] **Testing:**
  - [ ] Integration tests for full pipelines
  - [ ] Load testing (simulate multiple users)
  - [ ] Edge case testing
  - [ ] User acceptance testing

**Deliverable:** Polished demo-ready system with documentation.

---

### Phase 8: Future Enhancements (Post-Demo)
**Goal:** Ideas for future iterations.

**Potential Features:**
- [ ] **Learning from User Behavior:**
  - [ ] Track which suggestions user accepts/rejects
  - [ ] Fine-tune ranking algorithm
  - [ ] Personalized task prioritization

- [ ] **Advanced Context:**
  - [ ] Traffic/commute time integration
  - [ ] Social context (who's nearby)
  - [ ] Device context (battery, connectivity)

- [ ] **Collaboration:**
  - [ ] Shared tasks with family/team
  - [ ] Task delegation
  - [ ] Collaborative editing

- [ ] **Integrations:**
  - [ ] Email parsing (Gmail, Outlook)
  - [ ] SMS reminders
  - [ ] Smart home integration (Alexa, Google Home)

- [ ] **Analytics:**
  - [ ] Task completion rates
  - [ ] Productivity insights
  - [ ] Context effectiveness metrics

**Deliverable:** Roadmap for production version.

---

## 🎯 Success Metrics

### Demo Success Criteria:
- ✅ AI agent can add tasks from 4+ sources (notification, chat, voice, note)
- ✅ AI agent can update tasks without creating duplicates
- ✅ AI agent NEVER deletes tasks (hard constraint enforced)
- ✅ Context-aware suggestion works with weather and time
- ✅ Single task displayed prominently on HomePage
- ✅ All 5 MCP tools have >80% test coverage
- ✅ End-to-end demo runs smoothly without errors

### Technical Success Criteria:
- ✅ MCP protocol properly implemented
- ✅ Azure OpenAI function calling works reliably
- ✅ Database has full audit trail
- ✅ Response time <2 seconds for suggestions
- ✅ Clean separation of concerns (Edge/MCP/AI layers)

### User Experience Success Criteria:
- ✅ Zero-friction task creation (no manual input needed)
- ✅ Intelligent updates (milk → eggs) work intuitively
- ✅ Suggestions feel "smart" and context-appropriate
- ✅ User maintains full control (no unexpected deletions)
- ✅ Interface is calm and non-overwhelming

---

## 🚀 Quick Reference

### MCP Tool Summary
| Tool Name | Purpose | Can Modify DB? | AI Accessible? |
|-----------|---------|----------------|----------------|
| `add_task` | Create new tasks | ✅ INSERT | ✅ Yes |
| `update_task` | Modify existing tasks | ✅ UPDATE | ✅ Yes |
| `suggest_focus_task` | Get best task for now | ❌ READ-ONLY | ✅ Yes |
| `get_task_list` | Query tasks with filters | ❌ READ-ONLY | ✅ Yes |
| `get_context` | Get current user context | ❌ READ-ONLY | ✅ Yes |
| `delete_task` | ❌ NOT PROVIDED | ❌ BLOCKED | ❌ **NO** |

### Input Sources → Tools Mapping
| Input Source | Processing Flow | MCP Tools Used |
|--------------|-----------------|----------------|
| **Notification** | Parse → Analyze → Decide | `add_task` or `update_task` |
| **Voice** | Transcribe → Parse → Decide | `add_task` or `update_task` |
| **Chat** | Interpret intent → Execute | Any tool (conversational) |
| **Note** | Extract multiple tasks → Batch | `add_task` (multiple) |
| **Manual** | User types in app | `add_task` (direct) |

### Context → Suggestion Logic
| Context Factor | Impact on Suggestions | Example |
|----------------|----------------------|---------|
| **Weather: Rainy** | Filter out outdoor tasks | Skip "Mow lawn", suggest "Pay bills" |
| **Time: 3 AM** | Filter out social tasks | Skip "Call mom", suggest "Sleep" |
| **Location: Home** | Prefer home tasks | Suggest "Do laundry" not "Work presentation" |
| **Energy: Low** | Prefer low-effort tasks | Suggest "Read book" not "Gym session" |
| **Duration: 15 min** | Filter out long tasks | Skip "Deep work", suggest "Quick email" |

### Key Design Principles
1. **ADD-ONLY, NEVER DELETE**: AI can create and modify, but never remove tasks
2. **Context-Aware**: Every suggestion considers location, weather, time, energy
3. **Audit Trail**: Full history of all task changes with reasons
4. **User Agency**: User has final say, AI is an assistant not a dictator
5. **Zero Friction**: Task creation from any source, no manual input needed
6. **Single Focus**: Show ONE task at a time, not overwhelming lists
7. **Intelligent Updates**: Recognize when new input modifies existing tasks

### Environment Variables (.env)
```bash
# Azure SQL Database
AZURE_SQL_CONNECTION_STRING=mssql+pyodbc://username:password@your-server.database.windows.net:1433/memento-db?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no

# Azure Maps API
AZURE_MAPS_API_KEY=your_azure_maps_subscription_key

# Microsoft Graph (Optional - for calendar integration)
MS_GRAPH_CLIENT_ID=your_app_client_id
MS_GRAPH_CLIENT_SECRET=your_app_client_secret
MS_GRAPH_TENANT_ID=your_tenant_id

# Azure Key Vault (Production - for storing secrets)
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=True
LOG_LEVEL=INFO

# MCP Server Configuration
MCP_SERVER_NAME=memento-task-intelligence
MCP_SERVER_VERSION=1.0.0
```

### Azure SQL Connection String Format

**Option 1: SQL Authentication**
```
mssql+pyodbc://username:password@server.database.windows.net:1433/database?driver=ODBC+Driver+18+for+SQL+Server
```

**Option 2: Azure AD Authentication (Recommended for production)**
```python
from azure.identity import DefaultAzureCredential
from sqlalchemy.engine import URL

connection_url = URL.create(
    "mssql+pyodbc",
    username="your-username@your-server",
    host="your-server.database.windows.net",
    port=1433,
    database="memento-db",
    query={
        "driver": "ODBC Driver 18 for SQL Server",
        "authentication": "ActiveDirectoryIntegrated"
    }
)
```

### Quick Start Commands
```bash
# Install dependencies
pip install -r requirements.txt

# Set up database
alembic upgrade head

# Run development server
uvicorn main:app --reload --port 8000

# Run tests
pytest tests/ -v

# Check MCP tools
curl http://localhost:8000/mcp/tools

# Test task creation
curl -X POST http://localhost:8000/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "add_task",
    "parameters": {
      "title": "Buy milk",
      "source": "chat",
      "category": "personal"
    }
  }'
```

---

## 🏛️ Key Architectural Decisions

### Why Separate REST API and MCP Server?

**Decision:** Backend has TWO interfaces:
1. **REST API** (`/api/*` endpoints) for mobile app HTTP requests
2. **MCP Server** (stdio) for Azure AI Foundry agent tool calls

**Rationale:**
- ✅ **Separation of Concerns**: Mobile app doesn't need to know about MCP
- ✅ **Flexibility**: Can swap agent providers without changing mobile app
- ✅ **Testing**: Can test business logic independently
- ✅ **Security**: Agent can't directly call REST endpoints meant for users
- ✅ **Performance**: REST for sync operations, MCP for async agent workflows

### Why Azure SQL Instead of Cosmos DB or Table Storage?

**Decision:** Use Azure SQL Database (relational).

**Rationale:**
- ✅ **ACID Transactions**: Critical for audit trail integrity
- ✅ **Complex Queries**: Need JOINs for task history and contexts
- ✅ **Familiar**: SQL is well-understood, easy to debug
- ✅ **Cost-Effective**: Basic tier sufficient for demo/hackathon
- ✅ **Tooling**: Great support in Azure Data Studio, VS Code
- ❌ Cosmos DB: Overkill for structured task data, more expensive
- ❌ Table Storage: Too simple for relational queries

### Why stdio Transport for MCP?

**Decision:** MCP server uses stdio (not HTTP).

**Rationale:**
- ✅ **Azure AI Foundry Requirement**: Foundry expects stdio transport
- ✅ **Security**: No exposed ports, agent runs in same trust boundary
- ✅ **Simplicity**: No need for authentication between agent and tools
- ✅ **Performance**: Low latency, no HTTP overhead
- ✅ **Standard**: MCP stdio is the recommended pattern

### Why Embedded MCP Server in Backend?

**Decision:** MCP server runs as part of FastAPI process (not separate service).

**Rationale:**
- ✅ **Shared Database Connection**: Single connection pool for REST and MCP
- ✅ **Shared Business Logic**: TaskService used by both APIs
- ✅ **Simplified Deployment**: One service to deploy, not two
- ✅ **Development Speed**: Easier debugging with single process
- ⚠️ **Tradeoff**: If REST API crashes, MCP also down (acceptable for demo)

**Production Alternative:** Could split into microservices later:
```
┌──────────────┐      ┌──────────────┐
│  REST API    │      │  MCP Server  │
│  (FastAPI)   │──────│  (Python)    │
└──────────────┘      └──────────────┘
       │                      │
       └──────────┬───────────┘
                  │
          ┌───────▼────────┐
          │  Azure SQL DB  │
          └────────────────┘
```

### Why SQLAlchemy ORM Instead of Raw SQL?

**Decision:** Use SQLAlchemy for all database operations.

**Rationale:**
- ✅ **Security**: Automatic SQL injection prevention
- ✅ **Portability**: Could switch to PostgreSQL if needed
- ✅ **Type Safety**: Python type hints for database models
- ✅ **Relationships**: Easy to define task → history relationships
- ✅ **Migrations**: Alembic integration for schema evolution
- ❌ Raw SQL: Faster but error-prone, harder to maintain

### Why Pydantic for MCP Tool Schemas?

**Decision:** Define all tool parameters as Pydantic models.

**Rationale:**
- ✅ **Validation**: Automatic parameter validation before tool execution
- ✅ **Type Safety**: Runtime type checking
- ✅ **JSON Schema**: Auto-generates MCP tool schemas
- ✅ **Documentation**: Self-documenting code
- ✅ **IDE Support**: Autocomplete and type hints

### Why "No Delete" is Enforced Server-Side?

**Decision:** Agent cannot delete tasks; constraint enforced in MCP server.

**Rationale:**
- ✅ **Safety**: Prevents accidental data loss
- ✅ **Trust**: Users trust AI more if it can't delete things
- ✅ **Audit Trail**: Full history preserved forever
- ✅ **Undo-able**: User can always restore archived tasks
- ✅ **Legal**: Some industries require data retention
- ⚠️ **Tradeoff**: Database grows over time (mitigated by archiving)

### Why Context Enrichment in Backend, Not Agent?

**Decision:** Backend calls Azure Maps API, not agent.

**Rationale:**
- ✅ **Caching**: Backend caches weather for 15 minutes
- ✅ **Cost Control**: Fewer API calls than if agent called directly
- ✅ **API Key Security**: Keys never exposed to agent
- ✅ **Reliability**: Backend retries, agent doesn't
- ✅ **Testability**: Mock weather in tests easily

### Why Soft Delete (status='archived') Instead of Hard Delete?

**Decision:** Tasks are never physically deleted from database.

**Rationale:**
- ✅ **Audit Trail**: Can see what was deleted and when
- ✅ **Undo**: User can restore deleted tasks
- ✅ **Analytics**: Can analyze completion patterns
- ✅ **Legal Compliance**: Some regulations require retention
- ✅ **Machine Learning**: Historical data for future personalization

**Implementation:**
```sql
-- Soft delete
UPDATE tasks SET status = 'archived', updated_at = GETUTCDATE() WHERE id = @id;

-- Hard delete (NEVER used)
-- DELETE FROM tasks WHERE id = @id;  -- ❌ BLOCKED
```

---

## 🚧 Common Pitfalls & How to Avoid

### 1. Azure SQL Firewall Issues
**Problem:** Can't connect to database from local machine.  
**Solution:** 
- Add your IP to Azure SQL firewall rules
- Allow Azure services to access server
- Test with `sqlcmd` or Azure Data Studio first

### 2. MCP Server Not Responding
**Problem:** Agent can't discover tools.  
**Solution:**
- Check `mcp_server.py` runs without errors
- Verify JSON-RPC format (use `--verbose` flag)
- Test stdio manually: `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python mcp_server.py`

### 3. Azure AI Foundry Can't Find MCP Server
**Problem:** Agent configuration error.  
**Solution:**
- Ensure `python` is in PATH where agent runs
- Use absolute path: `/usr/bin/python3 /path/to/mcp_server.py`
- Check working directory is set correctly
- Verify environment variables are passed to agent

### 4. Task Updates Create Duplicates Instead
**Problem:** Agent creates new task instead of updating.  
**Solution:**
- Improve similarity detection in agent prompt
- Add task search before creating
- Prompt: "Before creating a new task, search for similar existing tasks"
- Consider semantic embeddings for fuzzy matching

### 5. Slow Context-Aware Suggestions
**Problem:** `suggest_focus_task` takes >2 seconds.  
**Solution:**
- Add database indexes: `CREATE INDEX idx_status ON tasks(status)`
- Cache pending tasks for 1 minute
- Pre-filter in SQL, not Python: `WHERE status = 'pending'`
- Limit to 50 most recent tasks

### 6. Connection String Errors
**Problem:** `pyodbc` can't connect.  
**Solution:**
- Install ODBC Driver 18: [Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
- URL encode password if it has special characters
- Test connection: `python -c "import pyodbc; pyodbc.connect('your_connection_string')"`

---

## 📚 Additional Resources

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Azure AI Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-studio/)
- [Azure SQL Database Quick Start](https://learn.microsoft.com/en-us/azure/azure-sql/database/single-database-create-quickstart)
- [Azure Maps Weather API](https://learn.microsoft.com/en-us/azure/azure-maps/weather-services-concepts)
- [SQLAlchemy with Azure SQL](https://docs.sqlalchemy.org/en/20/dialects/mssql.html)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Python MCP SDK Examples](https://github.com/anthropics/mcp-sdk-python)

---

## 🎓 Learning Resources

- **MCP Tutorial**: [Build Your First MCP Server](https://modelcontextprotocol.io/docs/quickstart)
- **Azure AI Foundry Tutorial**: [Create Your First Agent](https://learn.microsoft.com/en-us/azure/ai-studio/quickstart-agent)
- **SQLAlchemy ORM**: [Tutorial](https://docs.sqlalchemy.org/en/20/tutorial/)
- **Pydantic V2**: [Documentation](https://docs.pydantic.dev/latest/)

---

**Built with ❤️ for the "Experiencing the world without overwhelming it" Hackathon**
