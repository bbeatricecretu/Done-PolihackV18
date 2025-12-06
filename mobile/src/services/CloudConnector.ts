/**
 * CloudConnector Service (Local Version)
 * 
 * Originally connected to a backend, now processes everything locally
 * to make the app fully independent.
 */

import { TaskProcessor } from './TaskProcessor';
import { TaskManager } from './TaskManager';
import { DevLogger } from './DevLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_IP_KEY = '@memento_server_ip';
const DEFAULT_PORT = '3000';

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
   * Get the backend URL from AsyncStorage
   */
  private static async getBackendUrl(): Promise<string> {
    try {
      const storedIp = await AsyncStorage.getItem(SERVER_IP_KEY);
      const ip = storedIp || '192.168.1.128'; // Default fallback
      return `http://${ip}:${DEFAULT_PORT}`;
    } catch (e) {
      return 'http://192.168.1.128:3000';
    }
  }

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
   * Update backend URL - now uses AsyncStorage
   */
  static async setBackendUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(SERVER_IP_KEY, url);
    DevLogger.log('[CloudConnector] Backend URL set to:', url);
  }

  /**
   * Send notification to the bridge for MCP processing
   */
  static async sendNotification(notification: { appName: string, title: string, content: string, timestamp: string }) {
    try {
      const backendUrl = await this.getBackendUrl();
      DevLogger.log('[CloudConnector] Sending notification to bridge...', { url: backendUrl, title: notification.title });
      
      const response = await fetch(`${backendUrl}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      DevLogger.log('[CloudConnector] Notification sent to bridge successfully');
      return true;
    } catch (error) {
      DevLogger.log('[CloudConnector] Failed to send notification to bridge', error);
      return false;
    }
  }
}
