/**
 * Local Storage Service
 * 
 * Manages tasks in a local JSON file for offline-first capability.
 * This ensures the app works even without cloud connectivity.
 * Later, we'll sync with Azure SQL Database.
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const HISTORY_FILE = path.join(DATA_DIR, 'task_history.json');

// Task interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  source: 'notification' | 'voice' | 'chat' | 'note' | 'manual';
  source_app?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Task history entry
export interface TaskHistory {
  id: string;
  task_id: string;
  action: 'created' | 'updated' | 'deleted' | 'completed';
  changes?: Record<string, any>;
  timestamp: string;
}

/**
 * Initialize data directory and files
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Initialize tasks file if it doesn't exist
    try {
      await fs.access(TASKS_FILE);
    } catch {
      await fs.writeFile(TASKS_FILE, JSON.stringify([], null, 2));
      console.log('[LocalStorage] Created tasks.json');
    }

    // Initialize history file if it doesn't exist
    try {
      await fs.access(HISTORY_FILE);
    } catch {
      await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2));
      console.log('[LocalStorage] Created task_history.json');
    }

    console.log('[LocalStorage] ✓ Storage initialized');
  } catch (error) {
    console.error('[LocalStorage] Failed to initialize storage:', error);
    throw error;
  }
}

/**
 * Read all tasks from local storage
 */
export async function getAllTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    const tasks: Task[] = JSON.parse(data);
    return tasks.filter(task => !task.is_deleted);
  } catch (error) {
    console.error('[LocalStorage] Error reading tasks:', error);
    return [];
  }
}

/**
 * Get a single task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const tasks = await getAllTasks();
    return tasks.find(task => task.id === taskId) || null;
  } catch (error) {
    console.error('[LocalStorage] Error getting task:', error);
    return null;
  }
}

/**
 * Add a new task
 */
export async function addTask(taskData: Omit<Task, 'id' | 'is_deleted' | 'created_at' | 'updated_at'>): Promise<Task> {
  try {
    const tasks = await readAllTasks(); // Include deleted tasks
    
    const newTask: Task = {
      id: generateTaskId(),
      ...taskData,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    tasks.push(newTask);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));

    // Add to history
    await addHistory({
      id: generateHistoryId(),
      task_id: newTask.id,
      action: 'created',
      timestamp: newTask.created_at,
    });

    console.log('[LocalStorage] ✓ Task added:', newTask.id);
    return newTask;
  } catch (error) {
    console.error('[LocalStorage] Error adding task:', error);
    throw error;
  }
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  try {
    const tasks = await readAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId && !task.is_deleted);

    if (taskIndex === -1) {
      return null;
    }

    const oldTask = { ...tasks[taskIndex] };
    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...updates,
      id: taskId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));

    // Track changes in history
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach(key => {
      if (oldTask[key as keyof Task] !== updates[key as keyof Task]) {
        changes[key] = {
          old: oldTask[key as keyof Task],
          new: updates[key as keyof Task],
        };
      }
    });

    await addHistory({
      id: generateHistoryId(),
      task_id: taskId,
      action: 'updated',
      changes,
      timestamp: updatedTask.updated_at,
    });

    console.log('[LocalStorage] ✓ Task updated:', taskId);
    return updatedTask;
  } catch (error) {
    console.error('[LocalStorage] Error updating task:', error);
    throw error;
  }
}

/**
 * Delete a task (soft delete)
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const tasks = await readAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId && !task.is_deleted);

    if (taskIndex === -1) {
      return false;
    }

    const now = new Date().toISOString();
    tasks[taskIndex].is_deleted = true;
    tasks[taskIndex].deleted_at = now;
    tasks[taskIndex].updated_at = now;

    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));

    await addHistory({
      id: generateHistoryId(),
      task_id: taskId,
      action: 'deleted',
      timestamp: now,
    });

    console.log('[LocalStorage] ✓ Task deleted:', taskId);
    return true;
  } catch (error) {
    console.error('[LocalStorage] Error deleting task:', error);
    throw error;
  }
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string): Promise<Task | null> {
  try {
    const updatedTask = await updateTask(taskId, {
      status: 'completed',
    });

    if (updatedTask) {
      await addHistory({
        id: generateHistoryId(),
        task_id: taskId,
        action: 'completed',
        timestamp: new Date().toISOString(),
      });
    }

    return updatedTask;
  } catch (error) {
    console.error('[LocalStorage] Error completing task:', error);
    throw error;
  }
}

/**
 * Get task history
 */
export async function getTaskHistory(taskId?: string): Promise<TaskHistory[]> {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    const history: TaskHistory[] = JSON.parse(data);
    
    if (taskId) {
      return history.filter(entry => entry.task_id === taskId);
    }
    
    return history;
  } catch (error) {
    console.error('[LocalStorage] Error reading history:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Read all tasks including deleted ones (internal use)
 */
async function readAllTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[LocalStorage] Error reading all tasks:', error);
    return [];
  }
}

/**
 * Add entry to task history
 */
async function addHistory(entry: TaskHistory): Promise<void> {
  try {
    const history = await getTaskHistory();
    history.push(entry);
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('[LocalStorage] Error adding history:', error);
  }
}

/**
 * Generate unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique history ID
 */
function generateHistoryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get statistics about tasks
 */
export async function getTaskStats() {
  const tasks = await getAllTasks();
  
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    by_priority: {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    },
    by_source: {
      notification: tasks.filter(t => t.source === 'notification').length,
      chat: tasks.filter(t => t.source === 'chat').length,
      voice: tasks.filter(t => t.source === 'voice').length,
      manual: tasks.filter(t => t.source === 'manual').length,
      note: tasks.filter(t => t.source === 'note').length,
    },
  };
}
