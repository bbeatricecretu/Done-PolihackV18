/**
 * CloudConnector Service (Local Version)
 * 
 * Originally connected to a backend, now processes everything locally
 * to make the app fully independent.
 */

import { TaskProcessor } from './TaskProcessor';
import { TaskManager } from './TaskManager';
import { DevLogger } from './DevLogger';

// Backend response format (kept for compatibility)
interface ProcessNotificationResponse {
  success: boolean;
  action: 'task_created' | 'task_updated' | 'ignore';
  task?: {
    id: string | number;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
  };
  message?: string;
}

export class CloudConnector {
  /**
   * Process a notification locally
   */
  static async processNotification(
    title: string,
    body: string,
    appName: string
  ): Promise<ProcessNotificationResponse> {
    try {
      DevLogger.log('[CloudConnector] Processing notification locally', { title, appName, body });

      const shouldCreate = TaskProcessor.shouldCreateTask(title, body);

      if (shouldCreate) {
        const taskData = TaskProcessor.createTaskFromNotification(title, body, appName);
        const newTask = await TaskManager.addTask(taskData);
        
        DevLogger.log('[CloudConnector] ✓ Task created locally', newTask);

        return {
          success: true,
          action: 'task_created',
          task: newTask,
          message: 'Task created locally'
        };
      } else {
        DevLogger.log('[CloudConnector] Notification ignored (not a task)');
        return {
          success: true,
          action: 'ignore',
          message: 'Not a task'
        };
      }

    } catch (error) {
      DevLogger.log('[CloudConnector] Error processing notification', error);
      return {
        success: false,
        action: 'ignore',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Queue processing - No longer needed for local version but kept for API compatibility
   */
  static async processQueue(): Promise<void> {
    // No-op
  }

  /**
   * Send chat message - Mock response for now
   */
  static async sendChatMessage(message: string): Promise<any> {
    DevLogger.log('[CloudConnector] Chat message received', { message });
    return {
      success: true,
      response: "I'm running fully locally now! AI integration coming soon.",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch tasks from local storage
   */
  static async fetchTasks(): Promise<any[]> {
    return await TaskManager.getTasks();
  }

  /**
   * Update backend URL - No-op
   */
  static setBackendUrl(url: string): void {
    console.log('[CloudConnector] Running in local mode, URL ignored');
  }
}
