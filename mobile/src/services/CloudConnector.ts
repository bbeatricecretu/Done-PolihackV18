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
import { STORAGE_KEYS, DEFAULT_CONFIG } from '../config/constants';

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
      const storedIp = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_IP);
      const ip = storedIp || DEFAULT_CONFIG.FALLBACK_IP;
      return `http://${ip}:${DEFAULT_CONFIG.PORT}`;
    } catch (e) {
      return `http://${DEFAULT_CONFIG.FALLBACK_IP}:${DEFAULT_CONFIG.PORT}`;
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
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_IP, url);
    DevLogger.log('[CloudConnector] Backend URL set to:', url);
  }

  /**
   * Send notification to the bridge for MCP processing
   */
  static async sendNotification(notification: { appName: string, title: string, content: string, timestamp: string }) {
    try {
      const storedIp = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_IP);
      if (!storedIp) {
        DevLogger.log('[CloudConnector] No server IP configured; cannot forward notification. Set it in Settings.', notification);
        return false;
      }

      const backendUrl = `http://${storedIp}:${DEFAULT_CONFIG.PORT}`;
      DevLogger.log('[CloudConnector] Sending notification to bridge...', { url: backendUrl, title: notification.title, app: notification.appName });

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
      DevLogger.log('[CloudConnector] Failed to send notification to bridge', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }
}
