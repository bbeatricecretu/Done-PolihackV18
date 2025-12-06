require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');
const crypto = require('crypto');
const AIAgentService = require('./ai-agent-service');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize AI Agent Service
const aiAgent = new AIAgentService();

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

// Sync Endpoint
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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
=======
>>>>>>> Stashed changes
// Sync Location & Update Nearby Places
app.post('/api/sync-location', async (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  console.log(`Received location update: ${latitude}, ${longitude}`);
  const GOOGLE_API_KEY = 'AIzaSyDdFH1W6GHJ07UIL3WJ52mPFsGup9zCvYY';

  try {
    // 1. Get active tasks
    const result = await sql.query`
        SELECT * FROM Tasks 
        WHERE is_deleted = 0 
        AND status != 'completed'
    `;
    
    const tasks = result.recordset;
    let updatedTasksCount = 0;

    // Helper to detect category/keyword
    const detectSearchKeyword = (task) => {
        const text = (task.title + " " + (task.description || "")).toLowerCase();
        
        // 1. Expanded Category Mapping (Keyword -> Google Places Type/Query)
        const categoryMap = {
            // Food & Drink
            'grocery': ['grocery', 'supermarket', 'market', 'food', 'milk', 'bread', 'eggs', 'fruit', 'vegetable'],
            'bakery': ['bakery', 'bread', 'cake', 'pastry', 'bagel'],
            'cafe': ['cafe', 'coffee', 'latte', 'espresso', 'tea', 'starbucks'],
            'restaurant': ['restaurant', 'dinner', 'lunch', 'breakfast', 'eat', 'dining', 'meal', 'pizza', 'burger', 'sushi'],
            'bar': ['bar', 'pub', 'beer', 'wine', 'drink', 'alcohol', 'liquor'],
            
            // Health & Wellness
            'pharmacy': ['pharmacy', 'medicine', 'drug', 'pill', 'prescription', 'medication', 'chemist'],
            'hospital': ['hospital', 'clinic', 'doctor', 'emergency', 'medical'],
            'dentist': ['dentist', 'dental', 'teeth', 'tooth'],
            'gym': ['gym', 'workout', 'exercise', 'fitness', 'training', 'yoga', 'pilates', 'crossfit'],
            
            // Shopping
            'shopping_mall': ['mall', 'shopping', 'center', 'plaza'],
            'clothing_store': ['clothes', 'clothing', 'shirt', 'pants', 'dress', 'shoes', 'fashion', 'boutique'],
            'electronics_store': ['electronics', 'computer', 'phone', 'laptop', 'camera', 'tech', 'gadget'],
            'hardware_store': ['hardware', 'tool', 'paint', 'repair', 'construction', 'diy', 'home depot'],
            'book_store': ['book', 'novel', 'magazine', 'reading', 'library', 'bookstore'],
            'florist': ['flower', 'florist', 'bouquet', 'rose', 'plant'],
            'convenience_store': ['convenience', 'snack', 'drink', 'kiosk', '7-eleven'],
            
            // Services
            'bank': ['bank', 'atm', 'cash', 'deposit', 'withdraw', 'money'],
            'post_office': ['post', 'mail', 'package', 'shipping', 'letter', 'stamp', 'courier'],
            'laundry': ['laundry', 'dry clean', 'wash', 'clothes'],
            'hair_care': ['hair', 'haircut', 'barber', 'salon', 'beauty'],
            'car_repair': ['mechanic', 'car', 'auto', 'repair', 'tire', 'oil change', 'service'],
            'gas_station': ['gas', 'fuel', 'petrol', 'diesel', 'station'],
            
            // Leisure
            'park': ['park', 'garden', 'playground', 'walk', 'hike'],
            'movie_theater': ['movie', 'cinema', 'film', 'theater'],
            'library': ['library', 'study', 'books']
        };

        // 2. Check explicit category first
        if (task.category) {
            const catLower = task.category.toLowerCase();
            if (categoryMap[catLower]) return catLower; // Return the category name itself as the search term
            // Or map specific app categories to search terms
            if (catLower === 'shopping') return 'shopping_mall';
            if (catLower === 'health') return 'pharmacy';
            if (catLower === 'finance') return 'bank';
        }

        // 3. Check for keywords in text
        for (const [cat, keywords] of Object.entries(categoryMap)) {
            // Use word boundary check to avoid partial matches (e.g. "pill" in "pillow")
            if (keywords.some(k => new RegExp(`\\b${k}\\b`).test(text))) {
                return cat.replace('_', ' '); // Return "post office" instead of "post_office"
            }
        }

        // 4. Fallback: Intelligent Extraction
        // Remove common "stop words" and verbs to find the core object
        const stopWords = [
            'buy', 'get', 'purchase', 'find', 'pick', 'up', 'go', 'to', 'visit', 'check', 'do', 'make', 
            'the', 'a', 'an', 'some', 'my', 'for', 'at', 'in', 'on', 'today', 'tomorrow', 'now', 'later'
        ];
        
        const words = task.title.toLowerCase().split(/\s+/);
        const meaningfulWords = words.filter(w => !stopWords.includes(w) && w.length > 2);
        
        if (meaningfulWords.length > 0 && meaningfulWords.length <= 3) {
            return meaningfulWords.join(' ');
        }

        // 5. Last Resort: Use title if short enough
        return task.title.length < 30 ? task.title : null;
    };

    for (const task of tasks) {
        const keyword = detectSearchKeyword(task);
        if (!keyword) {
            console.log(`Skipping task "${task.title}" - no keyword detected`);
            continue;
        }

        console.log(`Processing task "${task.title}" with keyword "${keyword}"`);

        // Check if we already have locations for this task
        const existingLocations = await sql.query`
            SELECT TOP 1 id FROM TaskLocations WHERE task_id = ${task.id}
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

  } catch (err) {
    console.error('Sync location error:', err);
    res.status(500).json({ error: 'Internal server error' });
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQL Bridge running on port ${PORT}`);
  console.log(`Ensure your phone is on the same Wi-Fi and can reach this computer's IP.`);
  console.log(`\nAI Agent Endpoints:`);
  console.log(`  POST /api/process-notifications - Manually trigger AI processing`);
  console.log(`  GET  /api/notification-stats - View notification statistics`);
  
  // Auto-process notifications every minute
  if (process.env.AUTO_PROCESS_NOTIFICATIONS === 'true') {
    const intervalMinutes = parseInt(process.env.AUTO_PROCESS_INTERVAL_MINUTES || '1');
    console.log(`\n🤖 Auto-processing enabled: Running every ${intervalMinutes} minute(s)`);
    
    setInterval(async () => {
      console.log('\n[Auto-Process] Running scheduled AI Agent batch...');
      try {
        await aiAgent.processNotificationBatch(10);
      } catch (error) {
        console.error('[Auto-Process] Error:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  // Auto-cleanup old notifications
  const retentionMinutes = parseInt(process.env.NOTIFICATION_RETENTION_MINUTES || '10');
  console.log(`🗑️  Auto-cleanup enabled: Deleting notifications older than ${retentionMinutes} minutes`);
  
  // Run cleanup every 2 minutes
  setInterval(async () => {
    try {
      await aiAgent.cleanupOldNotifications(retentionMinutes);
    } catch (error) {
      console.error('[Auto-Cleanup] Error:', error);
    }
  }, 2 * 60 * 1000);
});
