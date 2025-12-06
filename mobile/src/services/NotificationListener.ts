/**
 * NotificationListener Service
 * 
 * This service listens to all device notifications and processes them
 * through LocalIntelligence before sending to backend.
 * 
 * IMPORTANT: This only works in standalone APK builds, NOT in Expo Go!
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { LocalIntelligence } from './LocalIntelligence';
import { CloudConnector } from './CloudConnector';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class NotificationListener {
  private subscription: any = null;
  private isListening: boolean = false;

  /**
   * Initialize notification listener
   * Requests permissions and sets up listener
   */
  async initialize() {
    if (Platform.OS !== 'android') {
      console.log('[NotificationListener] Only supported on Android');
      return false;
    }

    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationListener] Permission denied');
        return false;
      }

      console.log('[NotificationListener] Permissions granted');

      // Start listening to notifications
      this.startListening();
      return true;

    } catch (error) {
      console.error('[NotificationListener] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Start listening to incoming notifications
   */
  startListening() {
    if (this.isListening) {
      console.log('[NotificationListener] Already listening');
      return;
    }

    this.subscription = Notifications.addNotificationReceivedListener(
      this.handleNotification.bind(this)
    );

    this.isListening = true;
    console.log('[NotificationListener] Started listening');
  }

  /**
   * Stop listening to notifications
   */
  stopListening() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      this.isListening = false;
      console.log('[NotificationListener] Stopped listening');
    }
  }

  /**
   * Handle incoming notification
   * Process through LocalIntelligence then send to backend
   */
  async handleNotification(notification: Notifications.Notification) {
    try {
      const { request } = notification;
      const { content } = request;

      const title = content.title || '';
      const body = content.body || '';
      const appName = this.extractAppName(notification);

      console.log(`[NotificationListener] Received: ${appName} - ${title}`);

      // STEP 1: Local Intelligence Filter (Edge Brain)
      if (LocalIntelligence.isNoise(title, body)) {
        console.log('[NotificationListener] Filtered as noise');
        return; // Don't send to backend
      }

      // STEP 2: Calculate local urgency
      const urgency = LocalIntelligence.calculateLocalUrgency(title, body);
      console.log(`[NotificationListener] Urgency score: ${urgency}`);

      // STEP 3: Send to Cloud Brain (Backend + AI Agent)
      const result = await CloudConnector.processNotification(
        title,
        body,
        appName
      );

      console.log('[NotificationListener] Backend response:', result);

      // STEP 4: Handle response
      if (result.action === 'task_created') {
        console.log(`[NotificationListener] ✓ Task created: ${result.task?.title}`);
        // TODO: Update local task cache
        // TODO: Notify UI to refresh
      } else if (result.action === 'task_updated') {
        console.log(`[NotificationListener] ✓ Task updated: ${result.task?.title}`);
      } else if (result.action === 'ignore') {
        console.log('[NotificationListener] Backend ignored notification');
      }

    } catch (error) {
      console.error('[NotificationListener] Error processing notification:', error);
    }
  }

  /**
   * Extract app name from notification
   */
  private extractAppName(notification: Notifications.Notification): string {
    // Try to get app name from notification identifier
    const identifier = notification.request.identifier;
    
    // This is a simplified version - actual implementation depends on Android API
    // You may need to use native modules to get accurate app names
    if (identifier.includes('whatsapp')) return 'WhatsApp';
    if (identifier.includes('gmail')) return 'Gmail';
    if (identifier.includes('messenger')) return 'Messenger';
    if (identifier.includes('slack')) return 'Slack';
    
    return identifier.split('.')[0] || 'Unknown';
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<string> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }
}

// Export singleton instance
export const notificationListener = new NotificationListener();
