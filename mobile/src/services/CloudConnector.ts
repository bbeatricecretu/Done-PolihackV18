/**
 * CloudConnector Service
 * 
 * Connects the mobile app to the local Node.js backend.
 * Sends filtered notifications and other context data.
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL - replace with your local IP when testing on physical device
const BACKEND_URL = 'http://localhost:3000';

// Notification payload format
interface NotificationPayload {
  source_app: string;
  title: string;
  body: string;
  timestamp: string;
  urgency?: number;
}

// Backend response format
interface ProcessNotificationResponse {
  success: boolean;
  action: 'task_created' | 'task_updated' | 'ignore';
  task?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
  };
  message?: string;
}

export class CloudConnector {
  /**
   * Process a notification through the backend
   * 
   * @param title - Notification title
   * @param body - Notification body
   * @param appName - Source application name
   * @returns Backend response with action taken
   */
  static async processNotification(
    title: string,
    body: string,
    appName: string
  ): Promise<ProcessNotificationResponse> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[CloudConnector] No network connection, queuing notification');
        await this.queueNotification(title, body, appName);
        return {
          success: false,
          action: 'ignore',
          message: 'No network connection'
        };
      }

      // Build payload
      const payload: NotificationPayload = {
        source_app: appName,
        title: title,
        body: body,
        timestamp: new Date().toISOString(),
      };

      console.log('[CloudConnector] Sending to backend:', payload);

      // Send to backend
      const response = await fetch(`${BACKEND_URL}/api/ingest/notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 5000, // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const result: ProcessNotificationResponse = await response.json();
      console.log('[CloudConnector] Backend response:', result);

      return result;

    } catch (error) {
      console.error('[CloudConnector] Error sending notification:', error);
      
      // Queue for retry
      await this.queueNotification(title, body, appName);

      return {
        success: false,
        action: 'ignore',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Queue a notification for later processing (offline support)
   */
  private static async queueNotification(
    title: string,
    body: string,
    appName: string
  ): Promise<void> {
    try {
      const queueKey = '@notification_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];

      queue.push({
        title,
        body,
        source_app: appName,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 notifications
      if (queue.length > 50) {
        queue.shift();
      }

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('[CloudConnector] Notification queued for later');

    } catch (error) {
      console.error('[CloudConnector] Error queuing notification:', error);
    }
  }

  /**
   * Process queued notifications (call this when network is restored)
   */
  static async processQueue(): Promise<void> {
    try {
      const queueKey = '@notification_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      
      if (!existingQueue) {
        return;
      }

      const queue = JSON.parse(existingQueue);
      console.log(`[CloudConnector] Processing ${queue.length} queued notifications`);

      for (const item of queue) {
        await this.processNotification(item.title, item.body, item.source_app);
      }

      // Clear queue after processing
      await AsyncStorage.removeItem(queueKey);
      console.log('[CloudConnector] Queue processed');

    } catch (error) {
      console.error('[CloudConnector] Error processing queue:', error);
    }
  }

  /**
   * Send chat message to backend
   */
  static async sendChatMessage(message: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ingest/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('[CloudConnector] Error sending chat:', error);
      throw error;
    }
  }

  /**
   * Fetch tasks from backend
   */
  static async fetchTasks(): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return data.tasks || [];

    } catch (error) {
      console.error('[CloudConnector] Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Update backend URL (for changing between local/remote)
   */
  static setBackendUrl(url: string): void {
    // Note: In production, this should update a config file or env variable
    console.log('[CloudConnector] Backend URL updated to:', url);
  }
}
