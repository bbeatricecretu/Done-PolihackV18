/**
 * Tasks Router
 * 
 * Handles task CRUD operations with local JSON storage.
 * Later will sync with Azure SQL Database.
 */

import { Router, Request, Response } from 'express';
import * as localStorage from '../services/localStorage';

const router = Router();

/**
 * GET /api/tasks
 * 
 * Fetch all tasks from local storage
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Tasks] Fetching all tasks');

    const tasks = await localStorage.getAllTasks();
    const stats = await localStorage.getTaskStats();

    return res.json({
      success: true,
      tasks: tasks,
      count: tasks.length,
      stats: stats
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
    
    const task = await localStorage.getTaskById(id);

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
    const { title, description, category, priority, due_date } = req.body;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    console.log('[Tasks] Creating task:', title);

    const task = await localStorage.addTask({
      title: title.trim(),
      description: description?.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      status: 'pending',
      due_date: due_date,
      source: 'manual',
    });

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

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.is_deleted;

    console.log('[Tasks] Updating task:', id);

    const task = await localStorage.updateTask(id, updates);

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

    const success = await localStorage.deleteTask(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

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

/**
 * POST /api/tasks/:id/complete
 * 
 * Mark a task as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('[Tasks] Completing task:', id);

    const task = await localStorage.completeTask(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    return res.json({
      success: true,
      task: task,
      message: 'Task marked as completed'
    });

  } catch (error) {
    console.error('[Tasks] Error completing task:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tasks/:id/history
 * 
 * Get history of changes for a task
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await localStorage.getTaskHistory(id);

    return res.json({
      success: true,
      history: history,
      count: history.length
    });

  } catch (error) {
    console.error('[Tasks] Error fetching history:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
