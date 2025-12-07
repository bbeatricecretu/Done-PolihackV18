#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import sql from 'mssql';
import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';

// Load environment variables
dotenv.config();

// Database configuration
const sqlConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER || '',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// CosmosDB configuration
const cosmosClient = process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY 
  ? new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT, key: process.env.COSMOS_KEY })
  : null;

// Azure Maps configuration
const AZURE_MAPS_KEY = process.env.AZURE_MAPS_KEY || '';

// Database connection pool
let pool: sql.ConnectionPool | null = null;

async function connectToDatabase() {
  try {
    pool = await sql.connect(sqlConfig);
    console.error('Connected to Azure SQL Database');
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}

// Create MCP server instance
const server = new Server(
  {
    name: "mcp-task-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_notifications",
        description: "Get all notifications from CosmosDB for review. Agent should analyze these to determine if any should create/edit/delete tasks.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of notifications to retrieve (default: 50)"
            }
          }
        }
      },
      {
        name: "delete_notification",
        description: "Delete a notification from CosmosDB after processing it. Should be called after reviewing a notification, regardless of whether a tool was used.",
        inputSchema: {
          type: "object",
          properties: {
            notification_id: {
              type: "string",
              description: "The ID of the notification to delete"
            }
          },
          required: ["notification_id"]
        }
      },
      {
        name: "skip_notification",
        description: "Skip/ignore a notification that does NOT require task creation. Use this for: battery notifications, message counters, system alerts, questions from others, past-tense actions, casual chat, or any notification that is not a direct action request for the user. This marks the notification as processed without creating a task.",
        inputSchema: {
          type: "object",
          properties: {
            notification_id: {
              type: "string",
              description: "The ID of the notification to skip"
            },
            reason: {
              type: "string",
              description: "Brief reason for skipping (e.g., 'battery notification', 'message counter', 'not actionable')"
            }
          },
          required: ["notification_id", "reason"]
        }
      },
      {
        name: "create_task_from_notification",
        description: "Create a task ONLY if the notification is a DIRECT, EXPLICIT action request for the user to do something in the future. MUST verify: 1) Not a battery/system notification, 2) Not a message counter, 3) Not a question from someone else, 4) Not past-tense/completed action, 5) Not casual conversation. When in doubt, use skip_notification instead.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Task title extracted from notification"
            },
            description: {
              type: "string",
              description: "Task description"
            },
            category: {
              type: "string",
              description: "Task category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            priority: {
              type: "string",
              description: "Task priority",
              enum: ["low", "medium", "high"]
            },
            source_app: {
              type: "string",
              description: "Source app from notification"
            },
            notification_id: {
              type: "string",
              description: "Original notification ID for reference"
            }
          },
          required: ["title"],
        },
      },
      {
        name: "create_task_from_chat",
        description: "Create a task from user query in chatbot interface",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Task title"
            },
            description: {
              type: "string",
              description: "Task description"
            },
            category: {
              type: "string",
              description: "Task category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            priority: {
              type: "string",
              description: "Task priority",
              enum: ["low", "medium", "high"]
            },
            due_date: {
              type: "string",
              description: "Due date in ISO 8601 format"
            },
            location_dependent: {
              type: "boolean",
              description: "Whether task depends on location"
            },
            weather_dependent: {
              type: "boolean",
              description: "Whether task depends on weather"
            },
            time_dependent: {
              type: "boolean",
              description: "Whether task depends on time"
            }
          },
          required: ["title"],
        },
      },
      {
        name: "get_tasks_for_location",
        description: "Get active tasks that need location data. Returns tasks without TaskLocations entries so the agent can generate search queries for them.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of tasks to retrieve (default: 10)"
            }
          }
        }
      },
      {
        name: "generate_search_query_for_task",
        description: "Generate an optimized Google Maps API search query for a task. Analyzes task title, description, and category to create the best possible search term. Returns the search query that will be used with Google Places API.",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "Task UUID"
            },
            search_query: {
              type: "string",
              description: "Optimized search query for Google Maps API (e.g., 'grocery store', 'pharmacy', 'hardware store'). Should be concise and specific."
            }
          },
          required: ["task_id", "search_query"]
        }
      },
      {
        name: "suggest_tasks_by_context",
        description: "Suggest tasks based on location, weather, and time using Azure Maps. Reads task descriptions and finds relevant locations in the area.",
        inputSchema: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              description: "User's current latitude"
            },
            longitude: {
              type: "number",
              description: "User's current longitude"
            },
            radius_km: {
              type: "number",
              description: "Search radius in kilometers (default: 5)"
            }
          },
          required: ["latitude", "longitude"],
        },
      },
      {
        name: "mark_task_complete",
        description: "Mark a task as completed",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Task UUID to mark as complete"
            }
          },
          required: ["id"],
        },
      },
      {
        name: "edit_task",
        description: "Edit an existing task with partial updates",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Task UUID"
            },
            title: {
              type: "string",
              description: "Task title"
            },
            description: {
              type: "string",
              description: "Task description"
            },
            category: {
              type: "string",
              description: "Task category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            priority: {
              type: "string",
              description: "Task priority",
              enum: ["low", "medium", "high"]
            },
            due_date: {
              type: "string",
              description: "Due date in ISO 8601 format"
            },
            location_dependent: {
              type: "boolean",
              description: "Whether task depends on location"
            },
            weather_dependent: {
              type: "boolean",
              description: "Whether task depends on weather"
            },
            time_dependent: {
              type: "boolean",
              description: "Whether task depends on time"
            }
          },
          required: ["id"],
        },
      },
      {
        name: "get_important_tasks",
        description: "Get the most important tasks based on priority and due date. Can specify how many tasks to return.",
        inputSchema: {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "Number of tasks to return (default: 3)"
            },
            include_completed: {
              type: "boolean",
              description: "Whether to include completed tasks (default: false)"
            }
          },
          required: [],
        },
      },
      {
        name: "get_tasks_by_filter",
        description: "Get tasks filtered by various criteria",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            priority: {
              type: "string",
              description: "Filter by priority",
              enum: ["low", "medium", "high"]
            },
            status: {
              type: "string",
              description: "Filter by status",
              enum: ["pending", "completed"]
            },
            location_dependent: {
              type: "boolean",
              description: "Filter by location dependency"
            },
            weather_dependent: {
              type: "boolean",
              description: "Filter by weather dependency"
            },
            time_dependent: {
              type: "boolean",
              description: "Filter by time dependency"
            }
          },
          required: [],
        },
      },
      {
        name: "delete_task",
        description: "Soft delete a task (mark as deleted)",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Task UUID to delete"
            }
          },
          required: ["id"],
        },
      },
      {
        name: "store_chat_message",
        description: "Store a chat message in Cosmos DB for conversation history. Use this to maintain context across chat sessions.",
        inputSchema: {
          type: "object",
          properties: {
            chat_id: {
              type: "string",
              description: "Unique chat session ID (UUID). Use same ID to group related messages in a conversation."
            },
            message: {
              type: "string",
              description: "The chat message content"
            },
            role: {
              type: "string",
              description: "Who sent the message: user or assistant",
              enum: ["user", "assistant"]
            },
            metadata: {
              type: "object",
              description: "Optional metadata (task references, location, timestamp, etc.)"
            }
          },
          required: ["chat_id", "message", "role"]
        }
      },
      {
        name: "get_chat_history",
        description: "Get previous messages from a chat session to understand context and conversation flow. Essential for coherent multi-turn conversations.",
        inputSchema: {
          type: "object",
          properties: {
            chat_id: {
              type: "string",
              description: "Chat session ID"
            },
            limit: {
              type: "number",
              description: "Maximum number of recent messages to retrieve (default: 20)"
            },
            include_metadata: {
              type: "boolean",
              description: "Include metadata like task references (default: true)"
            }
          },
          required: ["chat_id"]
        }
      },
      {
        name: "get_all_tasks",
        description: "Get all tasks (both active and completed) with optional filters. Use this when user asks broad questions like 'show all my tasks', 'what have I done today?', 'list everything'.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status (default: all)",
              enum: ["pending", "completed", "all"]
            },
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            priority: {
              type: "string",
              description: "Filter by priority",
              enum: ["low", "medium", "high"]
            },
            limit: {
              type: "number",
              description: "Maximum tasks to return (default: 100)"
            },
            include_deleted: {
              type: "boolean",
              description: "Include soft-deleted tasks (default: false)"
            }
          },
          required: []
        }
      },
      {
        name: "search_tasks",
        description: "Search tasks by keyword in title or description. Use when user asks 'find my grocery tasks', 'tasks about dentist', 'what tasks mention John?'.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search keyword or phrase"
            },
            status: {
              type: "string",
              description: "Filter by status (default: all)",
              enum: ["pending", "completed", "all"]
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 20)"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_completed_tasks",
        description: "Get completed tasks with optional date filtering. Use for questions like 'what did I complete today?', 'show me finished tasks this week'.",
        inputSchema: {
          type: "object",
          properties: {
            date_range: {
              type: "string",
              description: "Predefined date range (default: this_week)",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "custom"]
            },
            custom_start: {
              type: "string",
              description: "Custom start date (ISO 8601) if date_range=custom"
            },
            custom_end: {
              type: "string",
              description: "Custom end date (ISO 8601) if date_range=custom"
            },
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            limit: {
              type: "number",
              description: "Maximum tasks (default: 50)"
            }
          },
          required: []
        }
      },
      {
        name: "bulk_delete_tasks",
        description: "Delete multiple tasks at once based on criteria. Use for 'delete all completed tasks', 'remove all shopping tasks', etc.",
        inputSchema: {
          type: "object",
          properties: {
            task_ids: {
              type: "array",
              items: { type: "string" },
              description: "Specific task IDs to delete (if provided, other filters ignored)"
            },
            status: {
              type: "string",
              description: "Delete tasks with this status",
              enum: ["pending", "completed"]
            },
            category: {
              type: "string",
              description: "Delete tasks in this category",
              enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
            },
            completed_before: {
              type: "string",
              description: "Delete tasks completed before this date (ISO 8601)"
            },
            require_confirmation: {
              type: "boolean",
              description: "If true, return count and list before deleting (default: true)"
            }
          },
          required: []
        }
      },
      {
        name: "update_task_status",
        description: "Update status of one or multiple tasks. Use for 'mark task X as complete', 'reopen task Y', 'complete all shopping tasks'.",
        inputSchema: {
          type: "object",
          properties: {
            task_ids: {
              type: "array",
              items: { type: "string" },
              description: "Task IDs to update"
            },
            new_status: {
              type: "string",
              description: "New status",
              enum: ["pending", "completed"]
            }
          },
          required: ["task_ids", "new_status"]
        }
      },
      {
        name: "get_tasks_summary",
        description: "Get task statistics: total pending, completed, by category, by priority. Use for 'how many tasks do I have?', 'task summary', 'what's my workload?'.",
        inputSchema: {
          type: "object",
          properties: {
            group_by: {
              type: "string",
              description: "How to group the summary (default: status)",
              enum: ["status", "category", "priority", "date"]
            }
          },
          required: []
        }
      },
      {
        name: "get_tasks_by_date",
        description: "Get tasks due on a specific date or date range. Use for 'what's due tomorrow?', 'tasks due this week', 'deadlines next month'.",
        inputSchema: {
          type: "object",
          properties: {
            date_type: {
              type: "string",
              description: "Which date field to filter on (default: due_date)",
              enum: ["due_date", "created_at", "completed_at"]
            },
            date_range: {
              type: "string",
              description: "Predefined date range",
              enum: ["today", "tomorrow", "this_week", "next_week", "this_month", "overdue", "custom"]
            },
            custom_start: {
              type: "string",
              description: "Custom start date (ISO 8601)"
            },
            custom_end: {
              type: "string",
              description: "Custom end date (ISO 8601)"
            },
            status: {
              type: "string",
              description: "Filter by status (default: pending)",
              enum: ["pending", "completed", "all"]
            }
          },
          required: ["date_range"]
        }
      },
      {
        name: "create_chat_session",
        description: "Create a new chat session with optional metadata. Use when starting a new conversation thread.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "User identifier (optional, for multi-user systems)"
            },
            session_name: {
              type: "string",
              description: "Optional name for the session (e.g., 'Task planning - Dec 7')"
            },
            metadata: {
              type: "object",
              description: "Optional metadata (device info, location, etc.)"
            }
          },
          required: []
        }
      },
      {
        name: "get_recent_chat_sessions",
        description: "Get list of recent chat sessions. Use for 'show my previous chats', 'resume last conversation'.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of sessions to retrieve (default: 10)"
            },
            user_id: {
              type: "string",
              description: "Filter by user (optional)"
            }
          },
          required: []
        }
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!pool) {
    throw new Error("Database not connected");
  }

  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_notifications":
      return await handleGetNotifications(args);
    
    case "delete_notification":
      return await handleDeleteNotification(args);
    
    case "skip_notification":
      return await handleSkipNotification(args);
    
    case "create_task_from_notification":
      return await handleCreateTaskFromNotification(args);
    
    case "create_task_from_chat":
      return await handleCreateTaskFromChat(args);
    
    case "suggest_tasks_by_context":
      return await handleSuggestTasksByContext(args);
    
    case "mark_task_complete":
      return await handleMarkTaskComplete(args);
    
    case "edit_task":
      return await handleEditTask(args);
    
    case "get_important_tasks":
      return await handleGetImportantTasks(args);
    
    case "get_tasks_by_filter":
      return await handleGetTasksByFilter(args);
    
    case "delete_task":
      return await handleDeleteTask(args);
    
    case "get_tasks_for_location":
      return await handleGetTasksForLocation(args);
    
    case "generate_search_query_for_task":
      return await handleGenerateSearchQuery(args);
    
    case "store_chat_message":
      return await handleStoreChatMessage(args);
    
    case "get_chat_history":
      return await handleGetChatHistory(args);
    
    case "get_all_tasks":
      return await handleGetAllTasks(args);
    
    case "search_tasks":
      return await handleSearchTasks(args);
    
    case "get_completed_tasks":
      return await handleGetCompletedTasks(args);
    
    case "bulk_delete_tasks":
      return await handleBulkDeleteTasks(args);
    
    case "update_task_status":
      return await handleUpdateTaskStatus(args);
    
    case "get_tasks_summary":
      return await handleGetTasksSummary(args);
    
    case "get_tasks_by_date":
      return await handleGetTasksByDate(args);
    
    case "create_chat_session":
      return await handleCreateChatSession(args);
    
    case "get_recent_chat_sessions":
      return await handleGetRecentChatSessions(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Tool handlers
async function handleGetNotifications(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured. Please set COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, and COSMOS_CONTAINER in .env",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);
    const limit = args.limit || 50;

    const { resources } = await container.items
      .query({
        query: "SELECT TOP @limit * FROM c ORDER BY c._ts DESC",
        parameters: [{ name: "@limit", value: limit }]
      })
      .fetchAll();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(resources, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching notifications: ${err.message}`,
        },
      ],
    };
  }
}

async function handleDeleteNotification(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured. Please set COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, and COSMOS_CONTAINER in .env",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);

    await container.item(args.notification_id, args.notification_id).delete();

    return {
      content: [
        {
          type: "text",
          text: `Notification ${args.notification_id} deleted successfully`,
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error deleting notification: ${err.message}`,
        },
      ],
    };
  }
}

async function handleSkipNotification(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured. Please set COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, and COSMOS_CONTAINER in .env",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);

    // Query to find the notification first
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: args.notification_id }]
    };
    
    const { resources } = await container.items.query(query).fetchAll();
    
    if (!resources || resources.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Notification ${args.notification_id} not found. It may have been already processed.`,
          },
        ],
      };
    }
    
    const notification = resources[0];
    
    // Mark as processed without creating a task
    notification.processed = true;
    notification.processed_at = new Date().toISOString();
    notification.skip_reason = args.reason;
    
    // Update with partition key
    await container.item(notification.id, notification.polihack).replace(notification);

    return {
      content: [
        {
          type: "text",
          text: `Notification ${args.notification_id} skipped successfully. Reason: ${args.reason}`,
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error skipping notification: ${err.message}`,
        },
      ],
    };
  }
}

async function handleCreateTaskFromNotification(args: any) {
  const request = pool!.request();
  
  const id = generateUUID();
  request.input('id', sql.UniqueIdentifier, id);
  request.input('title', sql.NVarChar(500), args.title);
  request.input('description', sql.NVarChar(sql.MAX), args.description || null);
  request.input('category', sql.NVarChar(50), args.category || 'general');
  request.input('priority', sql.NVarChar(20), args.priority || 'medium');
  request.input('status', sql.NVarChar(20), 'pending');
  request.input('created_at', sql.DateTime2(7), new Date());
  request.input('updated_at', sql.DateTime2(7), new Date());
  request.input('source', sql.NVarChar(50), 'notification');
  request.input('source_app', sql.NVarChar(100), args.source_app || 'unknown');
  request.input('is_deleted', sql.Bit, 0);
  request.input('notification_ref', sql.NVarChar(100), args.notification_id || null);

  await request.query`
    INSERT INTO Tasks (
      id, title, description, category, priority, status, 
      created_at, updated_at, source, source_app, is_deleted,
      LocationDependent, TimeDependent, WeatherDependent
    ) VALUES (
      @id, @title, @description, @category, @priority, @status, 
      @created_at, @updated_at, @source, @source_app, @is_deleted,
      0, 0, 0
    )
  `;

  return {
    content: [
      {
        type: "text",
        text: `Task created from notification with ID: ${id}`,
      },
    ],
  };
}

async function handleCreateTaskFromChat(args: any) {
  const request = pool!.request();
  
  const id = generateUUID();
  request.input('id', sql.UniqueIdentifier, id);
  request.input('title', sql.NVarChar(500), args.title);
  request.input('description', sql.NVarChar(sql.MAX), args.description || null);
  request.input('category', sql.NVarChar(50), args.category || 'general');
  request.input('priority', sql.NVarChar(20), args.priority || 'medium');
  request.input('status', sql.NVarChar(20), 'pending');
  request.input('due_date', sql.DateTime2(7), args.due_date ? new Date(args.due_date) : null);
  request.input('created_at', sql.DateTime2(7), new Date());
  request.input('updated_at', sql.DateTime2(7), new Date());
  request.input('source', sql.NVarChar(50), 'chat');
  request.input('source_app', sql.NVarChar(100), 'azure-foundry');
  request.input('is_deleted', sql.Bit, 0);
  request.input('location_dependent', sql.Bit, args.location_dependent ? 1 : 0);
  request.input('time_dependent', sql.Bit, args.time_dependent ? 1 : 0);
  request.input('weather_dependent', sql.Bit, args.weather_dependent ? 1 : 0);

  await request.query`
    INSERT INTO Tasks (
      id, title, description, category, priority, status, 
      due_date, created_at, updated_at, source, source_app, is_deleted,
      LocationDependent, TimeDependent, WeatherDependent
    ) VALUES (
      @id, @title, @description, @category, @priority, @status, 
      @due_date, @created_at, @updated_at, @source, @source_app, @is_deleted,
      @location_dependent, @time_dependent, @weather_dependent
    )
  `;

  return {
    content: [
      {
        type: "text",
        text: `Task created from chat with ID: ${id}`,
      },
    ],
  };
}

async function handleSuggestTasksByContext(args: any) {
  const { latitude, longitude, radius_km = 5 } = args;

  // Get tasks with location/weather/time dependencies
  const result = await pool!.query`
    SELECT * FROM Tasks 
    WHERE is_deleted = 0 
    AND status = 'pending'
    AND (LocationDependent = 1 OR WeatherDependent = 1 OR TimeDependent = 1)
  `;

  const tasks = result.recordset;
  const suggestions: any[] = [];

  // Use Azure Maps to find relevant locations
  for (const task of tasks) {
    if (task.LocationDependent && task.description && AZURE_MAPS_KEY) {
      try {
        // Search for POIs near user location related to task description
        const searchQuery = encodeURIComponent(task.description);
        const mapsUrl = `https://atlas.microsoft.com/search/nearby/json?api-version=1.0&lat=${latitude}&lon=${longitude}&radius=${radius_km * 1000}&subscription-key=${AZURE_MAPS_KEY}&query=${searchQuery}`;
        
        const response = await fetch(mapsUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          suggestions.push({
            task_id: task.id,
            task_title: task.title,
            task_description: task.description,
            nearby_locations: data.results.slice(0, 3).map((loc: any) => ({
              name: loc.poi?.name || 'Unknown',
              address: loc.address?.freeformAddress || 'Unknown',
              distance: loc.dist,
              position: loc.position
            })),
            reason: 'Location-dependent task with nearby relevant locations'
          });
        }
      } catch (err) {
        console.error('Azure Maps API error:', err);
      }
    } else if (task.WeatherDependent) {
      suggestions.push({
        task_id: task.id,
        task_title: task.title,
        task_description: task.description,
        reason: 'Weather-dependent task'
      });
    } else if (task.TimeDependent) {
      suggestions.push({
        task_id: task.id,
        task_title: task.title,
        task_description: task.description,
        reason: 'Time-dependent task'
      });
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(suggestions, null, 2),
      },
    ],
  };
}

async function handleMarkTaskComplete(args: any) {
  const request = pool!.request();
  
  request.input('id', sql.UniqueIdentifier, args.id);
  request.input('completed_at', sql.DateTime2(7), new Date());
  request.input('updated_at', sql.DateTime2(7), new Date());

  await request.query`
    UPDATE Tasks SET 
      status = 'completed',
      completed_at = @completed_at,
      updated_at = @updated_at
    WHERE id = @id
  `;

  return {
    content: [
      {
        type: "text",
        text: `Task ${args.id} marked as complete`,
      },
    ],
  };
}

async function handleEditTask(args: any) {
  const request = pool!.request();
  
  request.input('id', sql.UniqueIdentifier, args.id);
  request.input('updated_at', sql.DateTime2(7), new Date());

  const updates: string[] = ['updated_at = @updated_at'];

  if (args.title) {
    request.input('title', sql.NVarChar(500), args.title);
    updates.push('title = @title');
  }
  if (args.description !== undefined) {
    request.input('description', sql.NVarChar(sql.MAX), args.description);
    updates.push('description = @description');
  }
  if (args.category) {
    request.input('category', sql.NVarChar(50), args.category);
    updates.push('category = @category');
  }
  if (args.priority) {
    request.input('priority', sql.NVarChar(20), args.priority);
    updates.push('priority = @priority');
  }
  if (args.due_date !== undefined) {
    request.input('due_date', sql.DateTime2(7), args.due_date ? new Date(args.due_date) : null);
    updates.push('due_date = @due_date');
  }
  if (args.location_dependent !== undefined) {
    request.input('location_dependent', sql.Bit, args.location_dependent ? 1 : 0);
    updates.push('LocationDependent = @location_dependent');
  }
  if (args.weather_dependent !== undefined) {
    request.input('weather_dependent', sql.Bit, args.weather_dependent ? 1 : 0);
    updates.push('WeatherDependent = @weather_dependent');
  }
  if (args.time_dependent !== undefined) {
    request.input('time_dependent', sql.Bit, args.time_dependent ? 1 : 0);
    updates.push('TimeDependent = @time_dependent');
  }

  await request.query(`UPDATE Tasks SET ${updates.join(', ')} WHERE id = @id`);

  return {
    content: [
      {
        type: "text",
        text: `Task ${args.id} edited successfully`,
      },
    ],
  };
}

async function handleGetImportantTasks(args: any) {
  const count = args.count || 3;
  const includeCompleted = args.include_completed || false;

  const statusFilter = includeCompleted ? '' : 'AND status = \'pending\'';

  const result = await pool!.query`
    SELECT TOP ${count} * FROM Tasks 
    WHERE is_deleted = 0 
    ${statusFilter}
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      due_date ASC,
      created_at DESC
  `;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.recordset, null, 2),
      },
    ],
  };
}

async function handleGetTasksByFilter(args: any) {
  const request = pool!.request();
  
  const conditions: string[] = ['is_deleted = 0'];

  if (args.category) {
    request.input('category', sql.NVarChar(50), args.category);
    conditions.push('category = @category');
  }
  if (args.priority) {
    request.input('priority', sql.NVarChar(20), args.priority);
    conditions.push('priority = @priority');
  }
  if (args.status) {
    request.input('status', sql.NVarChar(20), args.status);
    conditions.push('status = @status');
  }
  if (args.location_dependent !== undefined) {
    request.input('location_dependent', sql.Bit, args.location_dependent ? 1 : 0);
    conditions.push('LocationDependent = @location_dependent');
  }
  if (args.weather_dependent !== undefined) {
    request.input('weather_dependent', sql.Bit, args.weather_dependent ? 1 : 0);
    conditions.push('WeatherDependent = @weather_dependent');
  }
  if (args.time_dependent !== undefined) {
    request.input('time_dependent', sql.Bit, args.time_dependent ? 1 : 0);
    conditions.push('TimeDependent = @time_dependent');
  }

  const whereClause = conditions.join(' AND ');
  const result = await request.query(`
    SELECT * FROM Tasks 
    WHERE ${whereClause}
    ORDER BY created_at DESC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.recordset, null, 2),
      },
    ],
  };
}

async function handleGetTasksForLocation(args: any) {
  const limit = args.limit || 10;
  
  const request = pool!.request();
  request.input('limit', sql.Int, limit);
  
  // Get tasks that don't have location data yet
  const result = await request.query(`
    SELECT TOP (@limit) t.id, t.title, t.description, t.category, t.priority, t.status, t.created_at
    FROM Tasks t
    LEFT JOIN TaskLocations tl ON t.id = tl.task_id
    WHERE t.is_deleted = 0 
      AND t.status != 'completed'
      AND tl.task_id IS NULL
    ORDER BY t.created_at DESC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          count: result.recordset.length,
          tasks: result.recordset
        }, null, 2),
      },
    ],
  };
}

async function handleGenerateSearchQuery(args: any) {
  const { task_id, search_query } = args;
  
  if (!task_id || !search_query) {
    throw new Error('task_id and search_query are required');
  }

  const request = pool!.request();
  request.input('task_id', sql.UniqueIdentifier, task_id);
  request.input('search_query', sql.NVarChar(255), search_query);
  request.input('updated_at', sql.DateTime2(7), new Date());

  // Store the search query in the Tasks table (add search_query column if needed)
  // For now, store it in description or create a new column
  await request.query(`
    UPDATE Tasks 
    SET updated_at = @updated_at
    WHERE id = @task_id
  `);

  // Insert a marker in TaskLocations to indicate query has been generated
  await request.query(`
    INSERT INTO TaskLocations (
      task_id, name, address, latitude, longitude, 
      place_id, rating, is_open, distance_meters
    ) VALUES (
      @task_id, 'SEARCH_QUERY_GENERATED', @search_query, 0, 0, 
      'PENDING_LOCATION_SYNC', 0, 0, 0
    )
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          task_id,
          search_query,
          message: `Search query "${search_query}" generated for task ${task_id}. Will be used on next location sync.`
        }, null, 2),
      },
    ],
  };
}

async function handleDeleteTask(args: any) {
  const request = pool!.request();
  
  request.input('id', sql.UniqueIdentifier, args.id);
  request.input('updated_at', sql.DateTime2(7), new Date());

  await request.query`
    UPDATE Tasks SET is_deleted = 1, updated_at = @updated_at WHERE id = @id
  `;

  return {
    content: [
      {
        type: "text",
        text: `Task ${args.id} deleted successfully`,
      },
    ],
  };
}

// Chat Message Handlers
async function handleStoreChatMessage(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured for chat storage",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container('chat'); // Chat container with partition key /chat

    const message = {
      id: generateUUID(),
      chat: args.chat_id, // Partition key
      message: args.message,
      role: args.role,
      timestamp: new Date().toISOString(),
      metadata: args.metadata || {}
    };

    await container.items.create(message);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message_id: message.id,
            chat_id: args.chat_id
          }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error storing chat message: ${err.message}`,
        },
      ],
    };
  }
}

async function handleGetChatHistory(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container('chat');
    const limit = args.limit || 20;
    const includeMetadata = args.include_metadata !== false;

    const query = {
      query: `SELECT ${includeMetadata ? '*' : 'c.id, c.message, c.role, c.timestamp'} 
              FROM c 
              WHERE c.chat = @chat_id 
              ORDER BY c.timestamp DESC 
              OFFSET 0 LIMIT @limit`,
      parameters: [
        { name: "@chat_id", value: args.chat_id },
        { name: "@limit", value: limit }
      ]
    };

    const { resources } = await container.items.query(query).fetchAll();

    // Reverse to get chronological order
    const messages = resources.reverse();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            chat_id: args.chat_id,
            message_count: messages.length,
            messages: messages
          }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching chat history: ${err.message}`,
        },
      ],
    };
  }
}

// Task Query Handlers
async function handleGetAllTasks(args: any) {
  const request = pool!.request();
  
  const status = args.status || 'all';
  const limit = args.limit || 100;
  const includeDeleted = args.include_deleted || false;
  
  let conditions: string[] = [];
  
  if (!includeDeleted) {
    conditions.push('is_deleted = 0');
  }
  
  if (status !== 'all') {
    request.input('status', sql.NVarChar(20), status);
    conditions.push('status = @status');
  }
  
  if (args.category) {
    request.input('category', sql.NVarChar(50), args.category);
    conditions.push('category = @category');
  }
  
  if (args.priority) {
    request.input('priority', sql.NVarChar(20), args.priority);
    conditions.push('priority = @priority');
  }
  
  request.input('limit', sql.Int, limit);
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  
  const result = await request.query(`
    SELECT TOP (@limit) * FROM Tasks 
    ${whereClause}
    ORDER BY 
      CASE WHEN status = 'pending' THEN 1 ELSE 2 END,
      created_at DESC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          count: result.recordset.length,
          tasks: result.recordset
        }, null, 2),
      },
    ],
  };
}

async function handleSearchTasks(args: any) {
  const request = pool!.request();
  
  const status = args.status || 'all';
  const limit = args.limit || 20;
  const searchQuery = `%${args.query}%`;
  
  request.input('query', sql.NVarChar(sql.MAX), searchQuery);
  request.input('limit', sql.Int, limit);
  
  let statusCondition = '';
  if (status !== 'all') {
    request.input('status', sql.NVarChar(20), status);
    statusCondition = 'AND status = @status';
  }
  
  const result = await request.query(`
    SELECT TOP (@limit) * FROM Tasks 
    WHERE is_deleted = 0 
      AND (title LIKE @query OR description LIKE @query)
      ${statusCondition}
    ORDER BY 
      CASE WHEN title LIKE @query THEN 1 ELSE 2 END,
      created_at DESC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          query: args.query,
          count: result.recordset.length,
          tasks: result.recordset
        }, null, 2),
      },
    ],
  };
}

async function handleGetCompletedTasks(args: any) {
  const request = pool!.request();
  
  const dateRange = args.date_range || 'this_week';
  const limit = args.limit || 50;
  
  let startDate: Date;
  let endDate: Date = new Date();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (dateRange) {
    case 'today':
      startDate = today;
      break;
    case 'yesterday':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = today;
      break;
    case 'this_week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - today.getDay()); // Start of week (Sunday)
      break;
    case 'last_week':
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - today.getDay()); // End of last week
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom':
      startDate = args.custom_start ? new Date(args.custom_start) : new Date(0);
      endDate = args.custom_end ? new Date(args.custom_end) : new Date();
      break;
    default:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
  }
  
  request.input('start_date', sql.DateTime2(7), startDate);
  request.input('end_date', sql.DateTime2(7), endDate);
  request.input('limit', sql.Int, limit);
  
  let categoryCondition = '';
  if (args.category) {
    request.input('category', sql.NVarChar(50), args.category);
    categoryCondition = 'AND category = @category';
  }
  
  const result = await request.query(`
    SELECT TOP (@limit) * FROM Tasks 
    WHERE is_deleted = 0 
      AND status = 'completed'
      AND completed_at >= @start_date
      AND completed_at <= @end_date
      ${categoryCondition}
    ORDER BY completed_at DESC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          date_range: dateRange,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          count: result.recordset.length,
          tasks: result.recordset
        }, null, 2),
      },
    ],
  };
}

async function handleBulkDeleteTasks(args: any) {
  const request = pool!.request();
  const requireConfirmation = args.require_confirmation !== false;
  
  let conditions: string[] = ['is_deleted = 0'];
  
  if (args.task_ids && args.task_ids.length > 0) {
    // Specific task IDs provided
    const ids = args.task_ids.map((id: string, index: number) => {
      request.input(`id${index}`, sql.UniqueIdentifier, id);
      return `@id${index}`;
    }).join(',');
    conditions = [`id IN (${ids})`];
  } else {
    // Filter-based deletion
    if (args.status) {
      request.input('status', sql.NVarChar(20), args.status);
      conditions.push('status = @status');
    }
    
    if (args.category) {
      request.input('category', sql.NVarChar(50), args.category);
      conditions.push('category = @category');
    }
    
    if (args.completed_before) {
      request.input('completed_before', sql.DateTime2(7), new Date(args.completed_before));
      conditions.push('completed_at < @completed_before');
    }
  }
  
  const whereClause = conditions.join(' AND ');
  
  if (requireConfirmation) {
    // Just return count and list
    const result = await request.query(`
      SELECT id, title, status, category FROM Tasks 
      WHERE ${whereClause}
    `);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            confirmation_required: true,
            count: result.recordset.length,
            tasks: result.recordset,
            message: `Found ${result.recordset.length} tasks to delete. Set require_confirmation=false to proceed.`
          }, null, 2),
        },
      ],
    };
  } else {
    // Actually delete
    request.input('updated_at', sql.DateTime2(7), new Date());
    
    const result = await request.query(`
      UPDATE Tasks 
      SET is_deleted = 1, updated_at = @updated_at 
      WHERE ${whereClause}
    `);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            deleted_count: result.rowsAffected[0]
          }, null, 2),
        },
      ],
    };
  }
}

async function handleUpdateTaskStatus(args: any) {
  const request = pool!.request();
  
  const newStatus = args.new_status;
  const taskIds = args.task_ids;
  
  if (!taskIds || taskIds.length === 0) {
    throw new Error('task_ids is required and must not be empty');
  }
  
  const ids = taskIds.map((id: string, index: number) => {
    request.input(`id${index}`, sql.UniqueIdentifier, id);
    return `@id${index}`;
  }).join(',');
  
  request.input('status', sql.NVarChar(20), newStatus);
  request.input('updated_at', sql.DateTime2(7), new Date());
  
  let query = `
    UPDATE Tasks 
    SET status = @status, updated_at = @updated_at
  `;
  
  if (newStatus === 'completed') {
    request.input('completed_at', sql.DateTime2(7), new Date());
    query += `, completed_at = @completed_at`;
  }
  
  query += ` WHERE id IN (${ids})`;
  
  const result = await request.query(query);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          updated_count: result.rowsAffected[0],
          new_status: newStatus
        }, null, 2),
      },
    ],
  };
}

async function handleGetTasksSummary(args: any) {
  const groupBy = args.group_by || 'status';
  
  let query = '';
  
  switch (groupBy) {
    case 'status':
      query = `
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
        FROM Tasks 
        WHERE is_deleted = 0
        GROUP BY status
      `;
      break;
    case 'category':
      query = `
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM Tasks 
        WHERE is_deleted = 0
        GROUP BY category
      `;
      break;
    case 'priority':
      query = `
        SELECT 
          priority,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM Tasks 
        WHERE is_deleted = 0
        GROUP BY priority
      `;
      break;
    case 'date':
      query = `
        SELECT 
          CONVERT(DATE, created_at) as date,
          COUNT(*) as created_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
        FROM Tasks 
        WHERE is_deleted = 0 
          AND created_at >= DATEADD(day, -30, GETDATE())
        GROUP BY CONVERT(DATE, created_at)
        ORDER BY date DESC
      `;
      break;
  }
  
  const result = await pool!.query(query);
  
  // Also get total stats
  const totalResult = await pool!.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
      COUNT(CASE WHEN priority = 'high' AND status = 'pending' THEN 1 END) as pending_high_priority
    FROM Tasks 
    WHERE is_deleted = 0
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          group_by: groupBy,
          totals: totalResult.recordset[0],
          grouped_data: result.recordset
        }, null, 2),
      },
    ],
  };
}

async function handleGetTasksByDate(args: any) {
  const request = pool!.request();
  
  const dateType = args.date_type || 'due_date';
  const dateRange = args.date_range;
  const status = args.status || 'pending';
  
  let startDate: Date;
  let endDate: Date;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (dateRange) {
    case 'today':
      startDate = today;
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'tomorrow':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() + 1);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'this_week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - today.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'next_week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() + (7 - today.getDay()));
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'overdue':
      startDate = new Date(0);
      endDate = today;
      break;
    case 'custom':
      startDate = args.custom_start ? new Date(args.custom_start) : new Date(0);
      endDate = args.custom_end ? new Date(args.custom_end) : new Date();
      break;
    default:
      throw new Error(`Invalid date_range: ${dateRange}`);
  }
  
  request.input('start_date', sql.DateTime2(7), startDate);
  request.input('end_date', sql.DateTime2(7), endDate);
  
  let statusCondition = '';
  if (status !== 'all') {
    request.input('status', sql.NVarChar(20), status);
    statusCondition = 'AND status = @status';
  }
  
  const dateField = dateType === 'created_at' ? 'created_at' : 
                    dateType === 'completed_at' ? 'completed_at' : 'due_date';
  
  const result = await request.query(`
    SELECT * FROM Tasks 
    WHERE is_deleted = 0 
      AND ${dateField} >= @start_date
      AND ${dateField} < @end_date
      ${statusCondition}
    ORDER BY ${dateField} ASC
  `);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          date_type: dateType,
          date_range: dateRange,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          count: result.recordset.length,
          tasks: result.recordset
        }, null, 2),
      },
    ],
  };
}

// Chat Session Handlers
async function handleCreateChatSession(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container('chat');

    const sessionId = generateUUID();
    const session = {
      id: `session-${sessionId}`,
      chat: sessionId, // Partition key
      user_id: args.user_id || 'default',
      session_name: args.session_name || `Chat - ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 0,
      metadata: args.metadata || {},
      type: 'session' // To distinguish from messages
    };

    await container.items.create(session);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            chat_id: sessionId,
            session
          }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating chat session: ${err.message}`,
        },
      ],
    };
  }
}

async function handleGetRecentChatSessions(args: any) {
  if (!cosmosClient || !process.env.COSMOS_DATABASE) {
    return {
      content: [
        {
          type: "text",
          text: "CosmosDB not configured",
        },
      ],
    };
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container('chat');
    const limit = args.limit || 10;

    let queryStr = `
      SELECT * FROM c 
      WHERE c.type = 'session'
    `;
    
    const parameters: any[] = [];
    
    if (args.user_id) {
      queryStr += ` AND c.user_id = @user_id`;
      parameters.push({ name: "@user_id", value: args.user_id });
    }
    
    queryStr += ` ORDER BY c.last_message_at DESC OFFSET 0 LIMIT @limit`;
    parameters.push({ name: "@limit", value: limit });

    const query = {
      query: queryStr,
      parameters: parameters
    };

    const { resources } = await container.items.query(query).fetchAll();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            count: resources.length,
            sessions: resources
          }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching chat sessions: ${err.message}`,
        },
      ],
    };
  }
}

// UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Start the server
async function main() {
  try {
    await connectToDatabase();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("MCP Task Server running on stdio");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
