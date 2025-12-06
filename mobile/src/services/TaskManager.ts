import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';
import { DevLogger } from './DevLogger';
import { createTaskInCloud, updateTaskInCloud, deleteTaskInCloud, fetchTasksFromCloud } from './CloudSync';

const TASKS_STORAGE_KEY = '@memento_tasks';

export class TaskManager {
  /**
   * Load all tasks from local storage and sync with cloud
   */
  static async getTasks(): Promise<Task[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      let tasks = jsonValue != null ? JSON.parse(jsonValue) : [];
      
      // Try to fetch from cloud and update local storage
      // We do this in background to not block UI, but for first load we might want to wait
      // For now, let's just return local, but trigger a sync
      // Actually, user asked to fetch from DB.
      
      return tasks;
    } catch (e) {
      console.error('Failed to load tasks', e);
      DevLogger.log('[TaskManager] Failed to load tasks', e);
      return [];
    }
  }

  static async syncWithCloud(): Promise<Task[]> {
    const currentTasks = await this.getTasks();
    const updatedTasks = await fetchTasksFromCloud(currentTasks);
    
    if (updatedTasks.length > 0) {
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      DevLogger.log('[TaskManager] Synced with cloud', { count: updatedTasks.length });
      return updatedTasks;
    }
    return currentTasks;
  }

  /**
   * Save a new task
   */
  static async addTask(task: Omit<Task, 'id'>): Promise<Task> {
    const tasks = await this.getTasks();
    
    // Generate a simple numeric ID (in a real app, use UUID)
    // Ensure we only consider valid numeric IDs
    const validIds = tasks.map(t => t.id).filter(id => typeof id === 'number' && !isNaN(id));
    const newId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
    
    const newTask: Task = {
      ...task,
      id: newId,
    };

    const updatedTasks = [newTask, ...tasks];
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    
    DevLogger.log('[TaskManager] Added task', newTask);
    
    // Sync to cloud
    try {
      await createTaskInCloud(newTask);
    } catch (e) {
      console.error('Cloud create failed', e);
    }
    
    return newTask;
  }

  /**
   * Update an existing task
   */
  static async updateTask(updatedTask: Task): Promise<void> {
    const tasks = await this.getTasks();
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    DevLogger.log('[TaskManager] Updated task', updatedTask);
    
    // Sync to cloud
    updateTaskInCloud(updatedTask).catch(e => console.error('Cloud update failed', e));
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: number): Promise<void> {
    const tasks = await this.getTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    DevLogger.log('[TaskManager] Deleted task', { id });
    
    // Sync to cloud
    deleteTaskInCloud(id).catch(e => console.error('Cloud delete failed', e));
  }
}
