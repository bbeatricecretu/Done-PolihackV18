require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');
const crypto = require('crypto');
const AIAgentService = require('./ai-agent-service');
const ChatAgentService = require('./chat-agent-service');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize AI Agent Services
const aiAgent = new AIAgentService();
const chatAgent = new ChatAgentService();

const PORT = 3000;

// Database configuration
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false // change to true for local dev / self-signed certs
  }
};

// CosmosDB configuration
const cosmosClient = process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY 
  ? new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT, key: process.env.COSMOS_KEY })
  : null;

// Connect to Database
async function connectToDb() {
  try {
    await sql.connect(sqlConfig);
    console.log('Connected to Azure SQL Database');
  } catch (err) {
    console.error('Database connection failed:', err);
  }

  if (cosmosClient) {
    try {
      if (process.env.COSMOS_DATABASE) {
        const database = cosmosClient.database(process.env.COSMOS_DATABASE);
        await database.read();
        console.log(`Connected to Azure Cosmos DB (Database: ${process.env.COSMOS_DATABASE})`);
      } else {
        console.log('Cosmos DB Client initialized (no database specified)');
      }
    } catch (err) {
      console.error('Cosmos DB connection failed:', err.message);
    }
  }
}

connectToDb();

// Execute MCP Tool Function
const CHATBOT_TOOLS = [
  'create_task_from_chat',
  'get_all_tasks',
  'search_tasks',
  'get_completed_tasks',
  'edit_task',
  'mark_task_complete',
  'delete_task',
  'bulk_delete_tasks',
  'update_task_status',
  'get_tasks_summary',
  'get_tasks_by_date'
];

async function executeMCPTool(toolName, args) {
  console.log(`[MCP] Executing tool: ${toolName}`);
  
  const pool = await sql.connect(sqlConfig);
  
  switch (toolName) {
    case 'create_task_from_chat':
      const taskId = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, taskId)
        .input('title', sql.NVarChar(sql.MAX), args.title)
        .input('description', sql.NVarChar(sql.MAX), args.description || '')
        .input('category', sql.NVarChar(sql.MAX), args.category || 'general')
        .input('priority', sql.NVarChar(sql.MAX), args.priority || 'medium')
        .input('status', sql.NVarChar(sql.MAX), 'pending')
        .input('due_date', sql.DateTime2, args.due_date ? new Date(args.due_date) : null)
        .input('LocationDependent', sql.Bit, args.location_dependent || false)
        .input('WeatherDependent', sql.Bit, args.weather_dependent || false)
        .input('TimeDependent', sql.Bit, args.time_dependent || false)
        .input('is_deleted', sql.Bit, false)
        .input('source', sql.NVarChar(sql.MAX), 'chat')
        .input('source_app', sql.NVarChar(sql.MAX), 'mobile_chat')
        .query(`INSERT INTO Tasks (id, title, description, category, priority, status, due_date, LocationDependent, WeatherDependent, TimeDependent, is_deleted, source, source_app, created_at, updated_at)
                VALUES (@id, @title, @description, @category, @priority, @status, @due_date, @LocationDependent, @WeatherDependent, @TimeDependent, @is_deleted, @source, @source_app, GETDATE(), GETDATE())`);
      return { id: taskId, title: args.title, message: 'Task created successfully' };
      
    case 'get_all_tasks':
      const status = args.status || 'all';
      let query = 'SELECT * FROM Tasks WHERE is_deleted = 0';
      if (status === 'pending') query += " AND status = 'pending'";
      if (status === 'completed') query += " AND status = 'completed'";
      if (args.category) query += ` AND category = '${args.category}'`;
      if (args.priority) query += ` AND priority = '${args.priority}'`;
      query += ' ORDER BY created_at DESC';
      if (args.limit) query += ` OFFSET 0 ROWS FETCH NEXT ${args.limit} ROWS ONLY`;
      
      const allTasksResult = await pool.request().query(query);
      return { tasks: allTasksResult.recordset, count: allTasksResult.recordset.length };
      
    case 'search_tasks':
      const searchQuery = `SELECT * FROM Tasks WHERE is_deleted = 0 AND (title LIKE '%${args.query}%' OR description LIKE '%${args.query}%')`;
      const searchResult = await pool.request().query(searchQuery);
      return { tasks: searchResult.recordset, count: searchResult.recordset.length };
      
    case 'mark_task_complete':
      // First, find the task by searching title/description
      let completeTaskId = null;
      if (args.search_query) {
        const searchResult = await pool.request()
          .query(`SELECT TOP 1 id, title FROM Tasks 
                  WHERE is_deleted = 0 AND status = 'pending'
                  AND (title LIKE '%${args.search_query}%' OR description LIKE '%${args.search_query}%')
                  ORDER BY created_at DESC`);
        if (searchResult.recordset.length > 0) {
          completeTaskId = searchResult.recordset[0].id;
          console.log(`[mark_task_complete] Found task: "${searchResult.recordset[0].title}" (ID: ${completeTaskId})`);
        } else {
          throw new Error(`No pending task found matching "${args.search_query}"`);
        }
      } else {
        throw new Error('search_query is required to find the task to complete');
      }
      
      await pool.request()
        .input('id', sql.UniqueIdentifier, completeTaskId)
        .query("UPDATE Tasks SET status = 'completed', completed_at = GETDATE(), updated_at = GETDATE() WHERE id = @id");
      return { id: completeTaskId, message: 'Task marked as complete' };
      
    case 'delete_task':
      // First, find the task by searching title/description
      let deleteTaskId = null;
      if (args.search_query) {
        const searchResult = await pool.request()
          .query(`SELECT TOP 1 id, title FROM Tasks 
                  WHERE is_deleted = 0
                  AND (title LIKE '%${args.search_query}%' OR description LIKE '%${args.search_query}%')
                  ORDER BY created_at DESC`);
        if (searchResult.recordset.length > 0) {
          deleteTaskId = searchResult.recordset[0].id;
          console.log(`[delete_task] Found task: "${searchResult.recordset[0].title}" (ID: ${deleteTaskId})`);
        } else {
          throw new Error(`No task found matching "${args.search_query}"`);
        }
      } else {
        throw new Error('search_query is required to find the task to delete');
      }
      
      await pool.request()
        .input('id', sql.UniqueIdentifier, deleteTaskId)
        .query('UPDATE Tasks SET is_deleted = 1, updated_at = GETDATE() WHERE id = @id');
      return { id: deleteTaskId, message: 'Task deleted' };
      
    case 'edit_task':
      // First, find the task by searching title/description
      let editTaskId = null;
      if (args.search_query) {
        const searchResult = await pool.request()
          .query(`SELECT TOP 1 id, title FROM Tasks 
                  WHERE is_deleted = 0 
                  AND (title LIKE '%${args.search_query}%' OR description LIKE '%${args.search_query}%')
                  ORDER BY created_at DESC`);
        if (searchResult.recordset.length > 0) {
          editTaskId = searchResult.recordset[0].id;
          console.log(`[edit_task] Found task: "${searchResult.recordset[0].title}" (ID: ${editTaskId})`);
        } else {
          throw new Error(`No task found matching "${args.search_query}"`);
        }
      } else {
        throw new Error('search_query is required to find the task to edit');
      }
      
      const request = pool.request();
      let updateParts = ['updated_at = GETDATE()'];
      
      if (args.new_title) {
        request.input('title', sql.NVarChar(sql.MAX), args.new_title);
        updateParts.push('title = @title');
      }
      if (args.new_description) {
        request.input('description', sql.NVarChar(sql.MAX), args.new_description);
        updateParts.push('description = @description');
      }
      if (args.priority) {
        request.input('priority', sql.NVarChar(sql.MAX), args.priority);
        updateParts.push('priority = @priority');
      }
      if (args.category) {
        request.input('category', sql.NVarChar(sql.MAX), args.category);
        updateParts.push('category = @category');
      }
      if (args.due_date) {
        request.input('due_date', sql.DateTime2, new Date(args.due_date));
        updateParts.push('due_date = @due_date');
      }
      if (args.status) {
        request.input('status', sql.NVarChar(sql.MAX), args.status);
        updateParts.push('status = @status');
        // If changing to pending, clear completed_at
        if (args.status === 'pending') {
          updateParts.push('completed_at = NULL');
        }
      }
      
      request.input('id', sql.UniqueIdentifier, editTaskId);
      await request.query(`UPDATE Tasks SET ${updateParts.join(', ')} WHERE id = @id`);
      return { id: editTaskId, message: 'Task updated successfully' };
      
    case 'get_completed_tasks':
      let completedQuery = "SELECT * FROM Tasks WHERE is_deleted = 0 AND status = 'completed'";
      if (args.category) completedQuery += ` AND category = '${args.category}'`;
      completedQuery += ' ORDER BY completed_at DESC';
      if (args.limit) completedQuery += ` OFFSET 0 ROWS FETCH NEXT ${args.limit} ROWS ONLY`;
      
      const completedResult = await pool.request().query(completedQuery);
      return { tasks: completedResult.recordset, count: completedResult.recordset.length };
      
    case 'get_tasks_summary':
      const summaryResult = await pool.request().query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
        FROM Tasks WHERE is_deleted = 0
      `);
      return summaryResult.recordset[0];
      
    case 'bulk_delete_tasks':
      if (args.task_ids && args.task_ids.length > 0) {
        const ids = args.task_ids.map(id => `'${id}'`).join(',');
        await pool.request().query(`UPDATE Tasks SET is_deleted = 1, updated_at = GETDATE() WHERE id IN (${ids})`);
        return { deleted_count: args.task_ids.length, message: 'Tasks deleted successfully' };
      }
      return { deleted_count: 0, message: 'No tasks to delete' };
      
    case 'update_task_status':
      if (args.search_query) {
        // Search for tasks matching the query
        const searchResult = await pool.request()
          .query(`SELECT id, title FROM Tasks 
                  WHERE is_deleted = 0
                  AND (title LIKE '%${args.search_query}%' OR description LIKE '%${args.search_query}%')`);
        
        if (searchResult.recordset.length === 0) {
          throw new Error(`No tasks found matching "${args.search_query}"`);
        }
        
        const taskIds = searchResult.recordset.map(t => t.id);
        const newStatus = args.new_status === 'completed' ? 'completed' : 'pending';
        
        // Update status for all found tasks
        const updateRequest = pool.request();
        for (let i = 0; i < taskIds.length; i++) {
          updateRequest.input(`id${i}`, sql.UniqueIdentifier, taskIds[i]);
        }
        
        const idParams = taskIds.map((_, i) => `@id${i}`).join(',');
        let updateQuery = `UPDATE Tasks SET status = '${newStatus}', updated_at = GETDATE()`;
        
        // If changing to pending, clear completed_at
        if (newStatus === 'pending') {
          updateQuery += ', completed_at = NULL';
        }
        
        updateQuery += ` WHERE id IN (${idParams})`;
        await updateRequest.query(updateQuery);
        
        console.log(`[update_task_status] Updated ${taskIds.length} task(s) to ${newStatus}`);
        return { updated_count: taskIds.length, message: `${taskIds.length} task(s) status updated to ${newStatus}` };
      }
      return { updated_count: 0, message: 'No search_query provided' };
      
    case 'get_tasks_by_date':
      let dateQuery = 'SELECT * FROM Tasks WHERE is_deleted = 0';
      const dateResult = await pool.request().query(dateQuery);
      return { tasks: dateResult.recordset, count: dateResult.recordset.length };
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Notification Ingest Endpoint
app.post('/api/notifications', async (req, res) => {
  console.log('\n========== NOTIFICATION RECEIVED ==========');
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  console.log('============================================\n');

  const { appName, title, content, timestamp } = req.body;

  if (!appName || !title) {
    console.log('ERROR: Missing required fields - appName:', appName, 'title:', title);
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!cosmosClient) {
    console.error('CosmosDB not configured');
    return res.status(503).json({ success: false, error: 'CosmosDB not configured' });
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);

    const notification = {
      id: crypto.randomUUID(),
      appName,
      title,
      content,
      timestamp: timestamp || new Date().toISOString(),
      processed: false,
      created_at: new Date().toISOString(),
      // Store task_id if this notification resulted in a task (filled by agent)
      related_task_id: null
    };

    await container.items.create(notification);

    console.log(`Stored notification from ${appName}: ${title}`);
    res.json({ success: true, message: 'Notification stored' });
  } catch (err) {
    console.error('Error storing notification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync Endpoint - Upload tasks from mobile to server
app.post('/api/sync', async (req, res) => {
  const { tasks, deviceId } = req.body;
  
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).send('Invalid tasks data');
  }

  console.log(`Received sync request with ${tasks.length} tasks from ${deviceId}`);

  try {
    let addedCount = 0;
    let skippedCount = 0;

    for (const task of tasks) {
      // Check if task exists
      const result = await sql.query`SELECT id FROM Tasks WHERE id = ${task.id}`;
      
      if (result.recordset.length === 0) {
        // Insert if not exists
        const request = new sql.Request();
        
        request.input('id', sql.UniqueIdentifier, task.id);
        request.input('title', sql.NVarChar(500), task.title);
        request.input('description', sql.NVarChar(sql.MAX), task.description || null);
        
        // Ensure category is valid (fallback to 'general' if invalid)
        const validCategories = ['general', 'meetings', 'finance', 'shopping', 'communication', 'health'];
        const category = validCategories.includes(task.category) ? task.category : 'general';
        request.input('category', sql.NVarChar(50), category);
        
        request.input('priority', sql.NVarChar(20), task.priority);
        request.input('status', sql.NVarChar(20), task.status);
        request.input('due_date', sql.DateTime2(7), task.due_date ? new Date(task.due_date) : null);
        request.input('created_at', sql.DateTime2(7), new Date(task.created_at));
        request.input('updated_at', sql.DateTime2(7), new Date(task.updated_at));
        request.input('source', sql.NVarChar(50), task.source);
        request.input('source_app', sql.NVarChar(100), task.source_app || null);
        request.input('is_deleted', sql.Bit, task.is_deleted ? 1 : 0);

        // Handle optional dependent fields if they exist in your TS type, otherwise default
        request.input('LocationDependent', sql.Bit, 0);
        request.input('TimeDependent', sql.Bit, 0);
        request.input('WeatherDependent', sql.Bit, 0);

        await request.query(`
            INSERT INTO Tasks (
                id, title, description, category, priority, status, 
                due_date, created_at, updated_at, source, source_app, is_deleted,
                LocationDependent, TimeDependent, WeatherDependent
            ) VALUES (
                @id, @title, @description, @category, @priority, @status, 
                @due_date, @created_at, @updated_at, @source, @source_app, @is_deleted,
                @LocationDependent, @TimeDependent, @WeatherDependent
            )
        `);
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      stats: { added: addedCount, skipped: skippedCount }
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync Download Endpoint - Get new/updated tasks from server to mobile
app.get('/api/sync/tasks', async (req, res) => {
  const { lastSyncTime } = req.query;
  
  try {
    let query;
    if (lastSyncTime) {
      // Get tasks updated after last sync
      const lastSync = new Date(lastSyncTime);
      query = await sql.query`
        SELECT * FROM Tasks 
        WHERE updated_at > ${lastSync}
        ORDER BY updated_at DESC
      `;
    } else {
      // Get all non-deleted tasks
      query = await sql.query`
        SELECT * FROM Tasks 
        WHERE is_deleted = 0
        ORDER BY updated_at DESC
      `;
    }
    
    console.log(`[Sync Download] Returning ${query.recordset.length} tasks (lastSync: ${lastSyncTime || 'none'})`);
    res.json({
      success: true,
      tasks: query.recordset,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Sync download error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get All Tasks
app.get('/api/tasks', async (req, res) => {
  console.log('[GET /api/tasks] Fetching all tasks...');
  try {
    const result = await sql.query`
      SELECT * FROM Tasks 
      WHERE is_deleted = 0 
      ORDER BY created_at DESC
    `;
    console.log(`[GET /api/tasks] Returning ${result.recordset.length} tasks`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Locations (optionally filtered by taskId)
app.get('/api/locations', async (req, res) => {
  const { taskId } = req.query;
  const hasTaskFilter = Boolean(taskId);

  console.log('[GET /api/locations] Fetching locations', hasTaskFilter ? `for task ${taskId}` : 'for all tasks');

  // Validate GUID format early to avoid SQL errors
  if (hasTaskFilter && !/^[0-9a-fA-F-]{36}$/.test(String(taskId))) {
    return res.status(400).json({ success: false, error: 'Invalid taskId format' });
  }

  try {
    const request = new sql.Request();
    let query = `
      SELECT tl.*, t.title as task_title
      FROM TaskLocations tl
      JOIN Tasks t ON tl.task_id = t.id
      WHERE t.is_deleted = 0
    `;

    if (hasTaskFilter) {
      request.input('taskId', sql.UniqueIdentifier, taskId);
      query += ' AND tl.task_id = @taskId';
    }

    query += '\n      ORDER BY tl.created_at DESC, tl.id DESC';

    const result = await request.query(query);
    console.log(`[GET /api/locations] Returning ${result.recordset.length} locations`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Task
app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  console.log('Creating task:', task.title);
  console.log('Due date received:', task.due_date);

  try {
    const request = new sql.Request();
    
    request.input('id', sql.UniqueIdentifier, task.id);
    request.input('title', sql.NVarChar(500), task.title);
    request.input('description', sql.NVarChar(sql.MAX), task.description || null);
    
    // Ensure category is valid
    const validCategories = ['general', 'meetings', 'finance', 'shopping', 'communication', 'health'];
    const category = validCategories.includes(task.category) ? task.category : 'general';
    request.input('category', sql.NVarChar(50), category);
    
    request.input('priority', sql.NVarChar(20), task.priority);
    request.input('status', sql.NVarChar(20), task.status);
    request.input('completed_at', sql.DateTime2(7), task.completed_at ? new Date(task.completed_at) : null);
    
    // Parse due_date with validation
    let dueDate = null;
    if (task.due_date) {
      const parsedDate = new Date(task.due_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: `Validation failed for parameter 'due_date'. Invalid date.` });
      }
      dueDate = parsedDate;
    }
    request.input('due_date', sql.DateTime2(7), dueDate);
    request.input('created_at', sql.DateTime2(7), new Date(task.created_at));
    request.input('updated_at', sql.DateTime2(7), new Date(task.updated_at));
    request.input('source', sql.NVarChar(50), task.source);
    request.input('source_app', sql.NVarChar(100), task.source_app || null);
    request.input('is_deleted', sql.Bit, task.is_deleted ? 1 : 0);
    request.input('LocationDependent', sql.Bit, 0);
    request.input('TimeDependent', sql.Bit, 0);
    request.input('WeatherDependent', sql.Bit, 0);

    await request.query(`
        INSERT INTO Tasks (
            id, title, description, category, priority, status, completed_at,
            due_date, created_at, updated_at, source, source_app, is_deleted,
            LocationDependent, TimeDependent, WeatherDependent
        ) VALUES (
            @id, @title, @description, @category, @priority, @status, @completed_at,
            @due_date, @created_at, @updated_at, @source, @source_app, @is_deleted,
            @LocationDependent, @TimeDependent, @WeatherDependent
        )
    `);

    res.json({ success: true, message: 'Task created' });
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const task = req.body;
  console.log('Updating task:', id);

  try {
    const request = new sql.Request();
    
    request.input('id', sql.UniqueIdentifier, id);
    request.input('title', sql.NVarChar(500), task.title);
    request.input('description', sql.NVarChar(sql.MAX), task.description || null);
    
    // Ensure category is valid
    const validCategories = ['general', 'meetings', 'finance', 'shopping', 'communication', 'health'];
    const category = validCategories.includes(task.category) ? task.category : 'general';
    request.input('category', sql.NVarChar(50), category);

    request.input('priority', sql.NVarChar(20), task.priority);
    request.input('status', sql.NVarChar(20), task.status);
    request.input('completed_at', sql.DateTime2(7), task.completed_at ? new Date(task.completed_at) : null);
    request.input('due_date', sql.DateTime2(7), task.due_date ? new Date(task.due_date) : null);
    request.input('updated_at', sql.DateTime2(7), new Date());
    request.input('is_deleted', sql.Bit, task.is_deleted ? 1 : 0);

    await request.query(`
        UPDATE Tasks SET
            title = @title,
            description = @description,
            category = @category,
            priority = @priority,
            status = @status,
            completed_at = @completed_at,
            due_date = @due_date,
            updated_at = @updated_at,
            is_deleted = @is_deleted
        WHERE id = @id
    `);

    res.json({ success: true, message: 'Task updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Task (Soft Delete)
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Deleting task:', id);

  try {
    const request = new sql.Request();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('updated_at', sql.DateTime2(7), new Date());

    await request.query(`
        UPDATE Tasks SET
            is_deleted = 1,
            updated_at = @updated_at
        WHERE id = @id
    `);

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual trigger endpoint for AI Agent processing
app.post('/api/process-notifications', async (req, res) => {
  console.log('\n[API] Manual trigger: Process notifications with AI Agent');
  
  try {
    const batchSize = req.body.batchSize || 10;
    const result = await aiAgent.processNotificationBatch(batchSize);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[API] Error processing notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notification statistics
app.get('/api/notification-stats', async (req, res) => {
  if (!cosmosClient) {
    return res.status(503).json({ error: 'CosmosDB not configured' });
  }

  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const container = database.container(process.env.COSMOS_CONTAINER);

    const { resources: all } = await container.items
      .query("SELECT VALUE COUNT(1) FROM c")
      .fetchAll();
    
    const { resources: unprocessed } = await container.items
      .query("SELECT VALUE COUNT(1) FROM c WHERE c.processed = false")
      .fetchAll();

    res.json({
      total: all[0] || 0,
      unprocessed: unprocessed[0] || 0,
      processed: (all[0] || 0) - (unprocessed[0] || 0)
    });
  } catch (error) {
    console.error('[API] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Location & Update Nearby Places
app.post('/api/sync-location', async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  console.log(`Received location update: ${latitude}, ${longitude}`);
  // Note: Consider moving this to .env
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  try {
    // 1. Get active tasks
    const result = await sql.query`
        SELECT * FROM Tasks 
        WHERE is_deleted = 0 
        AND status != 'completed'
    `;
    
    const tasks = result.recordset;
    let updatedTasksCount = 0;

    for (const task of tasks) {
        // Check if AI has already generated a search query
        const aiQueryCheck = await sql.query`
            SELECT TOP 1 address 
            FROM TaskLocations 
            WHERE task_id = ${task.id} 
              AND name = 'SEARCH_QUERY_GENERATED'
              AND place_id = 'PENDING_LOCATION_SYNC'
        `;

        if (aiQueryCheck.recordset.length === 0) {
            // No AI-generated query yet - skip this task
            // The AI agent will generate a query in the next cycle
            continue;
        }

        // Use AI-generated search query
        const keyword = aiQueryCheck.recordset[0].address;
        console.log(`✨ Using AI-generated query for "${task.title}": "${keyword}"`);
        
        // Delete the marker so we don't reprocess
        await sql.query`
            DELETE FROM TaskLocations 
            WHERE task_id = ${task.id} 
              AND name = 'SEARCH_QUERY_GENERATED'
        `;

        // Check if we already have real location data for this task
        const existingLocations = await sql.query`
            SELECT TOP 1 id FROM TaskLocations 
            WHERE task_id = ${task.id}
              AND name != 'SEARCH_QUERY_GENERATED'
        `;

        if (existingLocations.recordset.length > 0) {
            console.log(`Skipping task "${task.title}" - locations already exist`);
            continue;
        }

        // 2. Search Google Places
        const radius = 2000; // 2km
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK' && data.results.length > 0) {
                console.log(`Found ${data.results.length} places for "${keyword}"`);
                // 3. Clear old locations for this task
                await sql.query`DELETE FROM TaskLocations WHERE task_id = ${task.id}`;

                // 4. Insert new locations (top 10)
                const locations = data.results.slice(0, 10);
                
                for (const loc of locations) {
                    const request = new sql.Request();
                    request.input('task_id', sql.UniqueIdentifier, task.id);
                    request.input('name', sql.NVarChar(255), loc.name);
                    request.input('address', sql.NVarChar(500), loc.vicinity || loc.formatted_address);
                    request.input('latitude', sql.Float, loc.geometry.location.lat);
                    request.input('longitude', sql.Float, loc.geometry.location.lng);
                    request.input('place_id', sql.NVarChar(100), loc.place_id);
                    request.input('rating', sql.Float, loc.rating || null);
                    request.input('is_open', sql.Bit, loc.opening_hours?.open_now ? 1 : 0);

                    await request.query(`
                        INSERT INTO TaskLocations (
                            task_id, name, address, latitude, longitude, 
                            place_id, rating, is_open, distance_meters
                        ) VALUES (
                            @task_id, @name, @address, @latitude, @longitude, 
                            @place_id, @rating, @is_open, 0
                        )
                    `);
                }
                updatedTasksCount++;
            } else {
                console.log(`No places found for "${keyword}". Marking as processed.`);
                // Insert a dummy record so we don't search again
                const request = new sql.Request();
                request.input('task_id', sql.UniqueIdentifier, task.id);
                await request.query(`
                    INSERT INTO TaskLocations (
                        task_id, name, address, latitude, longitude, 
                        place_id, rating, is_open, distance_meters
                    ) VALUES (
                        @task_id, 'NO_LOCATIONS_FOUND', '', 0, 0, 
                        'NO_RESULTS', 0, 0, 0
                    )
                `);
            }
        } catch (err) {
            console.error(`Error processing task ${task.id}:`, err);
        }
    }

    res.json({ 
        success: true, 
        message: `Processed location for ${tasks.length} tasks. Updated locations for ${updatedTasksCount} tasks.` 
    });

    // After successful location sync, update distances and check for nearby tasks
    await updateDistancesAndNotify(latitude, longitude);

  } catch (err) {
    console.error('Sync location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Update distances in TaskLocations table and send proximity notifications
async function updateDistancesAndNotify(userLat, userLon) {
  try {
    // Get all task locations with valid coordinates
    const result = await sql.query`
      SELECT 
        tl.id as location_id,
        tl.task_id,
        tl.name as location_name,
        tl.address,
        tl.latitude,
        tl.longitude,
        tl.place_id,
        t.title as task_title,
        t.description as task_description,
        t.priority,
        t.status
      FROM TaskLocations tl
      INNER JOIN Tasks t ON tl.task_id = t.id
      WHERE tl.latitude != 0 
        AND tl.longitude != 0
        AND tl.place_id != 'NO_RESULTS'
        AND tl.place_id != 'PENDING_LOCATION_SYNC'
        AND t.is_deleted = 0
        AND t.status = 'pending'
    `;

    const locations = result.recordset;
    console.log(`📊 Updating distances for ${locations.length} task locations`);

    // Update each location's distance_meters column
    for (const loc of locations) {
      const distance = calculateDistance(
        userLat, 
        userLon, 
        loc.latitude, 
        loc.longitude
      );

      const distanceMeters = Math.round(distance);

      // Update the distance in the database
      const updateRequest = new sql.Request();
      updateRequest.input('location_id', sql.Int, loc.location_id);
      updateRequest.input('distance_meters', sql.Int, distanceMeters);

      await updateRequest.query(`
        UPDATE TaskLocations 
        SET distance_meters = @distance_meters 
        WHERE id = @location_id
      `);
    }

    // Now query for tasks within 100 meters, excluding those notified within 1 hour
    const nearbyResult = await sql.query`
      SELECT 
        tl.task_id,
        t.title,
        t.description,
        t.priority,
        tl.name as location_name,
        tl.address,
        tl.distance_meters,
        tl.latitude,
        tl.longitude,
        n.last_sent_time
      FROM TaskLocations tl
      INNER JOIN Tasks t ON tl.task_id = t.id
      LEFT JOIN Notifications n ON t.id = n.task_id 
        AND n.notification_type = 'location' 
        AND DATEDIFF(HOUR, n.last_sent_time, GETDATE()) < 1
      WHERE tl.distance_meters < 100
        AND tl.distance_meters > 0
        AND t.is_deleted = 0
        AND t.status = 'pending'
        AND n.id IS NULL
      ORDER BY tl.distance_meters ASC
    `;

    const nearbyTasks = nearbyResult.recordset;

    if (nearbyTasks.length > 0) {
      console.log(`📍 Found ${nearbyTasks.length} tasks within 100 meters (after cooldown filter)`);
      
      // Store notifications for the mobile app to poll
      global.proximityNotifications = global.proximityNotifications || [];
      
      for (const task of nearbyTasks) {
        console.log(`  → "${task.title}" at ${task.location_name} (${task.distance_meters}m away)`);
        
        // CRITICAL: Record notification in database FIRST to prevent race conditions
        try {
          const notifRequest = new sql.Request();
          notifRequest.input('task_id', sql.UniqueIdentifier, task.task_id);
          notifRequest.input('notification_type', sql.NVarChar(50), 'location');
          notifRequest.input('last_sent_time', sql.DateTime2(7), new Date());
          
          const insertResult = await notifRequest.query(`
            IF EXISTS (SELECT 1 FROM Notifications WHERE task_id = @task_id AND notification_type = @notification_type)
            BEGIN
              -- Check if last notification was sent more than 1 hour ago
              IF EXISTS (
                SELECT 1 FROM Notifications 
                WHERE task_id = @task_id 
                  AND notification_type = @notification_type
                  AND DATEDIFF(HOUR, last_sent_time, GETDATE()) >= 1
              )
              BEGIN
                UPDATE Notifications 
                SET last_sent_time = @last_sent_time, 
                    notification_count = notification_count + 1
                WHERE task_id = @task_id AND notification_type = @notification_type
                SELECT 1 as should_send
              END
              ELSE
              BEGIN
                SELECT 0 as should_send
              END
            END
            ELSE
            BEGIN
              INSERT INTO Notifications (task_id, notification_type, last_sent_time, notification_count)
              VALUES (@task_id, @notification_type, @last_sent_time, 1)
              SELECT 1 as should_send
            END
          `);
          
          const shouldSend = insertResult.recordset[0]?.should_send;
          
          if (shouldSend === 1) {
            // Only queue if database confirmed it's okay to send
            global.proximityNotifications.push({
              task_id: task.task_id,
              title: `📍 Nearby Task: ${task.title}`,
              body: `You're ${task.distance_meters}m away from ${task.location_name}`,
              priority: task.priority,
              distance: task.distance_meters,
              location_name: task.location_name,
              timestamp: Date.now(),
              id: Date.now().toString() + Math.random().toString(36)
            });
            
            console.log(`  ✅ Notification queued and recorded: ${task.title}`);
          } else {
            console.log(`  ⏭️  Skipped (already sent within 1 hour): ${task.title}`);
          }
        } catch (dbError) {
          console.error(`  ⚠️  Database error, skipping notification for safety:`, dbError.message);
          // Do NOT queue notification if database operation fails
        }
      }
      
      // Clean up old notifications from memory (older than 10 minutes)
      global.proximityNotifications = global.proximityNotifications.filter(
        n => Date.now() - n.timestamp < 10 * 60 * 1000
      );
    } else {
      console.log(`📍 No tasks within 100 meters of current location`);
    }

  } catch (error) {
    console.error('Error updating distances and checking proximity:', error);
  }
}

// New endpoint for mobile to poll proximity notifications
app.get('/api/proximity-notifications', async (req, res) => {
  try {
    const notifications = global.proximityNotifications || [];
    
    // Return all pending notifications and clear them
    global.proximityNotifications = [];
    
    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error getting proximity notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoints
// Process chat message with AI agent
app.post('/api/chat/message', async (req, res) => {
  console.log('\n========== CHAT MESSAGE RECEIVED ==========');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { chat_id, message, timezone } = req.body;
  
  if (!chat_id || !message) {
    console.log('ERROR: Missing chat_id or message');
    return res.status(400).json({ success: false, error: 'Missing chat_id or message' });
  }
  
  if (!cosmosClient) {
    console.error('CosmosDB not configured');
    return res.status(503).json({ success: false, error: 'CosmosDB not configured' });
  }
  
  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const chatContainer = database.container('chat');
    
    // 1. Store user message DIRECTLY in Cosmos DB (no AI involved)
    const userMessageDoc = {
      id: crypto.randomUUID(),
      chat: chat_id,
      message: message,
      role: 'user',
      timestamp: new Date().toISOString(),
      metadata: {}
    };
    
    await chatContainer.items.create(userMessageDoc);
    console.log('[Chat] ✅ Stored user message directly in Cosmos DB');
    
    // 2. Get recent conversation history DIRECTLY from Cosmos DB
    const historyQuery = {
      query: `SELECT c.message, c.role, c.timestamp 
              FROM c 
              WHERE c.chat = @chat_id
              ORDER BY c.timestamp DESC 
              OFFSET 0 LIMIT 20`,
      parameters: [{ name: "@chat_id", value: chat_id }]
    };
    
    // Query with partition key for better performance
    const { resources: historyResources } = await chatContainer.items
      .query(historyQuery, { partitionKey: chat_id })
      .fetchAll();
    const conversationHistory = historyResources.reverse(); // Chronological order
    
    console.log(`[Chat] Retrieved ${conversationHistory.length} previous messages from Cosmos DB`);
    
    // 3. Process with AI agent (AI only generates response, doesn't store anything)
    const deviceTimezone = timezone || 'UTC'; // Use device timezone or fallback to UTC
    const agentResult = await chatAgent.processChatMessage(chat_id, message, conversationHistory, deviceTimezone);
    
    if (!agentResult.success) {
      throw new Error(agentResult.error || 'Agent processing failed');
    }
    
    let assistantMessage = agentResult.message;
    console.log('[Chat] Agent initial response:', assistantMessage);
    
    // 5. Execute tool calls immediately and provide feedback
    let executionResults = [];
    if (agentResult.tool_calls && agentResult.tool_calls.length > 0) {
      console.log(`[Chat] Executing ${agentResult.tool_calls.length} tool calls immediately`);
      
      for (const toolCall of agentResult.tool_calls) {
        try {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`[Chat] Executing: ${functionName}`, functionArgs);
          
          // Execute the tool via MCP
          const toolResult = await executeMCPTool(functionName, functionArgs);
          
          executionResults.push({
            tool_call_id: toolCall.id,
            tool: functionName,
            args: functionArgs,
            success: true,
            result: toolResult
          });
          
          console.log(`[Chat] ✅ ${functionName} executed successfully`);
        } catch (error) {
          console.error(`[Chat] ❌ Error executing ${toolCall.function.name}:`, error.message);
          executionResults.push({
            tool_call_id: toolCall.id,
            tool: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
            success: false,
            error: error.message
          });
        }
      }

      // Generate follow-up response based on tool results
      // Only if we executed chatbot-specific tools
      const chatbotToolExecutions = executionResults.filter(r => 
        CHATBOT_TOOLS.includes(r.tool)
      );

      if (chatbotToolExecutions.length > 0) {
        console.log('[Chat] Generating follow-up response based on tool results...');
        const followUpResult = await chatAgent.generateFollowUpResponse(
          chat_id,
          message,
          conversationHistory,
          agentResult.tool_calls,
          executionResults,
          deviceTimezone
        );

        if (followUpResult.success && followUpResult.message) {
          assistantMessage = followUpResult.message;
          console.log('[Chat] Agent follow-up response:', assistantMessage);
        }
      }
    }
    
    // 4. Store assistant message DIRECTLY in Cosmos DB (no AI involved)
    const assistantMessageDoc = {
      id: crypto.randomUUID(),
      chat: chat_id,
      message: assistantMessage,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tool_calls: agentResult.tool_calls?.length || 0,
        finish_reason: agentResult.finish_reason
      }
    };
    
    await chatContainer.items.create(assistantMessageDoc);
    console.log('[Chat] ✅ Stored assistant message directly in Cosmos DB');
    
    console.log('============================================\n');
    
    res.json({
      success: true,
      chat_id: chat_id,
      user_message_id: userMessageDoc.id,
      assistant_message_id: assistantMessageDoc.id,
      response: assistantMessage,
      tool_calls: agentResult.tool_calls || [],
      execution_results: executionResults
    });
    
  } catch (error) {
    console.error('[Chat] Error processing message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get chat history
app.get('/api/chat/:chat_id/history', async (req, res) => {
  const { chat_id } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  if (!cosmosClient) {
    return res.status(503).json({ error: 'CosmosDB not configured' });
  }
  
  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const chatContainer = database.container('chat');
    
    const query = {
      query: `SELECT * FROM c 
              WHERE c.chat = @chat_id AND c.type != 'session'
              ORDER BY c.timestamp ASC 
              OFFSET 0 LIMIT @limit`,
      parameters: [
        { name: "@chat_id", value: chat_id },
        { name: "@limit", value: limit }
      ]
    };
    
    const { resources } = await chatContainer.items.query(query).fetchAll();
    
    res.json({
      success: true,
      chat_id: chat_id,
      message_count: resources.length,
      messages: resources
    });
    
  } catch (error) {
    console.error('[Chat] Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new chat session
app.post('/api/chat/session', async (req, res) => {
  const { user_id, session_name } = req.body;
  
  if (!cosmosClient) {
    return res.status(503).json({ error: 'CosmosDB not configured' });
  }
  
  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const chatContainer = database.container('chat');
    
    const sessionId = crypto.randomUUID();
    const session = {
      id: `session-${sessionId}`,
      chat: sessionId,
      type: 'session',
      user_id: user_id || 'default',
      session_name: session_name || `Chat - ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 0,
      metadata: {}
    };
    
    await chatContainer.items.create(session);
    
    res.json({
      success: true,
      chat_id: sessionId,
      session: session
    });
    
  } catch (error) {
    console.error('[Chat] Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent chat sessions
app.get('/api/chat/sessions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const user_id = req.query.user_id;
  
  if (!cosmosClient) {
    return res.status(503).json({ error: 'CosmosDB not configured' });
  }
  
  try {
    const database = cosmosClient.database(process.env.COSMOS_DATABASE);
    const chatContainer = database.container('chat');
    
    let queryStr = `SELECT * FROM c WHERE c.type = 'session'`;
    const parameters = [];
    
    if (user_id) {
      queryStr += ` AND c.user_id = @user_id`;
      parameters.push({ name: "@user_id", value: user_id });
    }
    
    queryStr += ` ORDER BY c.last_message_at DESC OFFSET 0 LIMIT @limit`;
    parameters.push({ name: "@limit", value: limit });
    
    const query = { query: queryStr, parameters: parameters };
    const { resources } = await chatContainer.items.query(query).fetchAll();
    
    res.json({
      success: true,
      count: resources.length,
      sessions: resources
    });
    
  } catch (error) {
    console.error('[Chat] Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Store for tracking last location update
let lastLocationUpdate = null;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQL Bridge running on port ${PORT}`);
  console.log(`Ensure your phone is on the same Wi-Fi and can reach this computer's IP.`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/notifications - Receive notifications`);
  console.log(`  POST /api/sync - Upload tasks from mobile`);
  console.log(`  GET  /api/sync/tasks - Download new tasks to mobile (every 5s)`);
  console.log(`  POST /api/sync-location - Update location & find nearby places`);
  console.log(`  GET  /api/proximity-notifications - Poll for location-based task alerts`);
  console.log(`  POST /api/process-notifications - Manually trigger AI processing`);
  console.log(`  GET  /api/notification-stats - View notification statistics`);
  
  // 1. Auto-process notifications every 1 minute
  if (process.env.AUTO_PROCESS_NOTIFICATIONS === 'true') {
    const intervalMinutes = parseInt(process.env.AUTO_PROCESS_INTERVAL_MINUTES || '1');
    console.log(`\n🤖 [1] AI Agent: Processing notifications every ${intervalMinutes} minute(s)`);
    
    setInterval(async () => {
      console.log('\n========== AI AGENT BATCH PROCESSING ==========');
      try {
        await aiAgent.processNotificationBatch(10);
      } catch (error) {
        console.error('[Auto-Process] Error:', error);
      }
      console.log('===============================================\n');
    }, intervalMinutes * 60 * 1000);
  }

  // 1.5 Auto-generate search queries for tasks needing location data
  console.log(`🔍 [1.5] AI Agent: Generating search queries for tasks every 30 seconds`);
  
  setInterval(async () => {
    try {
      await aiAgent.generateSearchQueriesForTasks(5);
    } catch (error) {
      console.error('[Auto-SearchQuery] Error:', error);
    }
  }, 30 * 1000); // Every 30 seconds

  // 2. Auto-cleanup old notifications every 2 minutes
  const retentionMinutes = parseInt(process.env.NOTIFICATION_RETENTION_MINUTES || '10');
  console.log(`🗑️  [2] Cleanup: Deleting notifications older than ${retentionMinutes} minutes`);
  
  setInterval(async () => {
    try {
      await aiAgent.cleanupOldNotifications(retentionMinutes);
    } catch (error) {
      console.error('[Auto-Cleanup] Error:', error);
    }
  }, 2 * 60 * 1000);

  // 2.5 Auto-cleanup old proximity notification records (older than 24 hours)
  console.log(`🗑️  [2.5] Cleanup: Deleting old proximity notification records every 1 hour`);
  
  setInterval(async () => {
    try {
      await sql.query`
        DELETE FROM Notifications 
        WHERE notification_type = 'location' 
          AND DATEDIFF(HOUR, last_sent_time, GETDATE()) > 24
      `;
      console.log('[Cleanup] Deleted old proximity notification records');
    } catch (error) {
      console.error('[Auto-Cleanup Proximity] Error:', error);
    }
  }, 60 * 60 * 1000); // Every 1 hour

  // 3. Auto-update locations for tasks with recent location data
  console.log(`📍 [3] Location: Auto-updating task locations when location changes`);
  console.log(`    Note: Mobile app should call POST /api/sync-location periodically`);
  console.log(`\n✅ All background jobs initialized`);
});