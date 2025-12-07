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
