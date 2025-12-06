#!/usr/bin/env node
/**
 * HTTP/SSE Transport MCP Server
 *
 * This exposes the MCP server over HTTP with Server-Sent Events (SSE)
 * so it can be connected to Azure AI Foundry as a remote endpoint
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from 'express';
import cors from 'cors';
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import sql from 'mssql';
import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';
// Load environment variables
dotenv.config();
const PORT = process.env.MCP_SERVER_PORT || 3001;
const API_KEY = process.env.MCP_API_KEY || 'your-secret-api-key-here';
// Database configuration
const sqlConfig = {
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
let pool = null;
async function connectToDatabase() {
    try {
        pool = await sql.connect(sqlConfig);
        console.log('Connected to Azure SQL Database');
    }
    catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}
// UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Create Express app
const app = express();
app.use(cors());
app.use(express.json());
// API Key middleware
function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: pool ? 'connected' : 'disconnected',
        cosmosdb: cosmosClient ? 'configured' : 'not configured'
    });
});
// MCP SSE endpoint
app.get('/sse', authenticateApiKey, async (req, res) => {
    console.log('New SSE connection established');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    const transport = new SSEServerTransport('/message', res);
    const server = createMCPServer();
    await server.connect(transport);
    req.on('close', () => {
        console.log('SSE connection closed');
    });
});
// MCP message endpoint
app.post('/message', authenticateApiKey, async (req, res) => {
    // This will be handled by the SSE transport
    res.status(200).send('OK');
});
// Create MCP server instance with all tool handlers
function createMCPServer() {
    const server = new Server({
        name: "mcp-task-server-http",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
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
                    description: "Delete a notification from CosmosDB after processing it.",
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
                    name: "create_task_from_notification",
                    description: "Create a task based on notification data.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "Task title" },
                            description: { type: "string", description: "Task description" },
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
                            source_app: { type: "string", description: "Source app" },
                            notification_id: { type: "string", description: "Notification ID" }
                        },
                        required: ["title"],
                    },
                },
                {
                    name: "edit_task",
                    description: "Edit an existing task with partial updates",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Task UUID" },
                            title: { type: "string", description: "Task title" },
                            description: { type: "string", description: "Task description" },
                            category: {
                                type: "string",
                                enum: ["general", "meetings", "finance", "shopping", "communication", "health"]
                            },
                            priority: {
                                type: "string",
                                enum: ["low", "medium", "high"]
                            },
                            status: { type: "string", description: "Task status" }
                        },
                        required: ["id"],
                    },
                },
                {
                    name: "delete_task",
                    description: "Soft-delete a task",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Task UUID" }
                        },
                        required: ["id"],
                    },
                },
                {
                    name: "mark_task_complete",
                    description: "Mark a task as completed",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Task UUID" }
                        },
                        required: ["id"],
                    },
                },
                {
                    name: "get_tasks_by_filter",
                    description: "Get tasks with optional filters",
                    inputSchema: {
                        type: "object",
                        properties: {
                            category: { type: "string" },
                            priority: { type: "string" },
                            status: { type: "string" },
                            source_app: { type: "string" }
                        }
                    },
                }
            ],
        };
    });
    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        switch (name) {
            case "get_notifications":
                return await handleGetNotifications(args);
            case "delete_notification":
                return await handleDeleteNotification(args);
            case "create_task_from_notification":
                return await handleCreateTaskFromNotification(args);
            case "edit_task":
                return await handleEditTask(args);
            case "delete_task":
                return await handleDeleteTask(args);
            case "mark_task_complete":
                return await handleMarkTaskComplete(args);
            case "get_tasks_by_filter":
                return await handleGetTasksByFilter(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    });
    return server;
}
// Tool handlers (same as stdio version)
async function handleGetNotifications(args) {
    if (!cosmosClient || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
        return {
            content: [{
                    type: "text",
                    text: "CosmosDB not configured",
                }],
        };
    }
    try {
        const database = cosmosClient.database(process.env.COSMOS_DATABASE);
        const container = database.container(process.env.COSMOS_CONTAINER);
        const limit = args.limit || 50;
        const { resources } = await container.items
            .query({
            query: "SELECT * FROM c WHERE c.processed = false ORDER BY c._ts DESC OFFSET 0 LIMIT @limit",
            parameters: [{ name: "@limit", value: limit }]
        })
            .fetchAll();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(resources, null, 2),
                }],
        };
    }
    catch (err) {
        return {
            content: [{
                    type: "text",
                    text: `Error: ${err.message}`,
                }],
        };
    }
}
async function handleDeleteNotification(args) {
    if (!cosmosClient || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
        return { content: [{ type: "text", text: "CosmosDB not configured" }] };
    }
    try {
        const database = cosmosClient.database(process.env.COSMOS_DATABASE);
        const container = database.container(process.env.COSMOS_CONTAINER);
        await container.item(args.notification_id, args.notification_id).delete();
        return {
            content: [{
                    type: "text",
                    text: `Notification ${args.notification_id} deleted`,
                }],
        };
    }
    catch (err) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
}
async function handleCreateTaskFromNotification(args) {
    const request = pool.request();
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
    await request.query `
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
    return { content: [{ type: "text", text: `Task created: ${id}` }] };
}
async function handleEditTask(args) {
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, args.id);
    request.input('updated_at', sql.DateTime2(7), new Date());
    const updates = ['updated_at = @updated_at'];
    if (args.title) {
        request.input('title', sql.NVarChar(500), args.title);
        updates.push('title = @title');
    }
    if (args.description) {
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
    if (args.status) {
        request.input('status', sql.NVarChar(20), args.status);
        updates.push('status = @status');
    }
    await request.query(`UPDATE Tasks SET ${updates.join(', ')} WHERE id = @id`);
    return { content: [{ type: "text", text: `Task ${args.id} updated` }] };
}
async function handleDeleteTask(args) {
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, args.id);
    request.input('updated_at', sql.DateTime2(7), new Date());
    await request.query `UPDATE Tasks SET is_deleted = 1, updated_at = @updated_at WHERE id = @id`;
    return { content: [{ type: "text", text: `Task ${args.id} deleted` }] };
}
async function handleMarkTaskComplete(args) {
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, args.id);
    request.input('completed_at', sql.DateTime2(7), new Date());
    request.input('updated_at', sql.DateTime2(7), new Date());
    await request.query `
    UPDATE Tasks 
    SET status = 'completed', completed_at = @completed_at, updated_at = @updated_at 
    WHERE id = @id
  `;
    return { content: [{ type: "text", text: `Task ${args.id} marked complete` }] };
}
async function handleGetTasksByFilter(args) {
    let query = 'SELECT * FROM Tasks WHERE is_deleted = 0';
    const request = pool.request();
    if (args.category) {
        request.input('category', sql.NVarChar(50), args.category);
        query += ' AND category = @category';
    }
    if (args.priority) {
        request.input('priority', sql.NVarChar(20), args.priority);
        query += ' AND priority = @priority';
    }
    if (args.status) {
        request.input('status', sql.NVarChar(20), args.status);
        query += ' AND status = @status';
    }
    if (args.source_app) {
        request.input('source_app', sql.NVarChar(100), args.source_app);
        query += ' AND source_app = @source_app';
    }
    query += ' ORDER BY created_at DESC';
    const result = await request.query(query);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result.recordset, null, 2),
            }],
    };
}
// Start server
async function startServer() {
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`MCP HTTP Server running on http://localhost:${PORT}`);
        console.log(`\nEndpoints:`);
        console.log(`  GET  /health - Health check`);
        console.log(`  GET  /sse    - MCP SSE connection (requires X-API-Key header)`);
        console.log(`\nAzure AI Foundry Configuration:`);
        console.log(`  Remote MCP Server endpoint: http://localhost:${PORT}/sse`);
        console.log(`  Authentication: Key-based`);
        console.log(`  Credential: X-API-Key = ${API_KEY}`);
        console.log(`\nMake sure to expose this with ngrok or deploy to Azure for remote access!`);
    });
}
startServer().catch(console.error);
