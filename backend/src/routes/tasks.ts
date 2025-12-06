/**
 * Tasks Router
 * 
 * Handles task CRUD operations
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Temporary in-memory storage (will be replaced with Azure SQL)
let tasks: any[] = [];

/**
 * GET /api/tasks
 * 
 * Fetch all tasks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Tasks] Fetching all tasks');

    // TODO: Fetch from Azure SQL Database
    
    return res.json({
      success: true,
      tasks: tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('[Tasks] Error fetching tasks:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tasks/:id
 * 
 * Fetch a single task by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Fetch from Azure SQL Database
    const task = tasks.find(t => t.id === id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    return res.json({
      success: true,
      task: task
    });

  } catch (error) {
    console.error('[Tasks] Error fetching task:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/tasks
 * 
 * Create a new task manually
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const taskData = req.body;

    console.log('[Tasks] Creating task:', taskData.title);

    // TODO: Insert into Azure SQL Database via MCP
    const task = {
      id: `task_${Date.now()}`,
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    tasks.push(task);

    return res.status(201).json({
      success: true,
      task: task
    });

  } catch (error) {
    console.error('[Tasks] Error creating task:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/tasks/:id
 * 
 * Update a task
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[Tasks] Updating task:', id);

    // TODO: Update in Azure SQL Database via MCP
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      task: tasks[taskIndex]
    });

  } catch (error) {
    console.error('[Tasks] Error updating task:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * 
 * Delete a task (soft delete - marks as deleted)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('[Tasks] Deleting task:', id);

    // TODO: Soft delete in Azure SQL Database
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Soft delete
    tasks[taskIndex].is_deleted = true;
    tasks[taskIndex].deleted_at = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('[Tasks] Error deleting task:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
