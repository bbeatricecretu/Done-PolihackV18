import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';
import { DevLogger } from './DevLogger';

const TASKS_STORAGE_KEY = '@memento_tasks';

export class TaskManager {
  /**
   * Load all tasks from local storage
   */
  static async getTasks(): Promise<Task[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const tasks = jsonValue != null ? JSON.parse(jsonValue) : [];
      DevLogger.log('[TaskManager] Loaded tasks', { count: tasks.length });
      return tasks;
    } catch (e) {
      console.error('Failed to load tasks', e);
      DevLogger.log('[TaskManager] Failed to load tasks', e);
      return [];
    }
  }

  /**
   * Save a new task
   */
  static async addTask(task: Omit<Task, 'id'>): Promise<Task> {
    const tasks = await this.getTasks();
    
    // Generate a simple numeric ID (in a real app, use UUID)
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    
    const newTask: Task = {
      ...task,
      id: newId,
    };

    const updatedTasks = [newTask, ...tasks];
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    
    DevLogger.log('[TaskManager] Added task', newTask);
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
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: number): Promise<void> {
    const tasks = await this.getTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    DevLogger.log('[TaskManager] Deleted task', { id });
  }
}
