require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

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

// Connect to Database
async function connectToDb() {
  try {
    await sql.connect(sqlConfig);
    console.log('Connected to Azure SQL Database');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

connectToDb();

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
        request.input('category', sql.NVarChar(50), task.category);
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

        // Ensure category is valid (fallback to 'general' if invalid)
        const validCategories = ['general', 'meetings', 'finance', 'shopping', 'communication', 'health'];
        const category = validCategories.includes(task.category) ? task.category : 'general';
        request.input('category', sql.NVarChar(50), category);

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
  try {
    const result = await sql.query`
      SELECT * FROM Tasks 
      WHERE is_deleted = 0 
      ORDER BY created_at DESC
    `;
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
    request.input('due_date', sql.DateTime2(7), task.due_date ? new Date(task.due_date) : null);
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
            id, title, description, category, priority, status, 
            due_date, created_at, updated_at, source, source_app, is_deleted,
            LocationDependent, TimeDependent, WeatherDependent
        ) VALUES (
            @id, @title, @description, @category, @priority, @status, 
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQL Bridge running on port ${PORT}`);
  console.log(`Ensure your phone is on the same Wi-Fi and can reach this computer's IP.`);
});
