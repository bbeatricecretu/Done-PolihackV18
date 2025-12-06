/**
 * NotificationListener Service
 * 
 * This service listens to all device notifications and processes them
 * through LocalIntelligence before sending to backend.
 * 
 * USES: react-native-android-notification-listener
 */

import { Platform, Alert, Linking, DeviceEventEmitter } from 'react-native';
import { LocalIntelligence } from './LocalIntelligence';
import { TaskProcessor } from './TaskProcessor';
import { TaskManager } from './TaskManager';
import { DevLogger } from './DevLogger';
import { CloudConnector } from './CloudConnector';

// Conditional import for Android-only package
let RNAndroidNotificationListener: any;
let RNAndroidNotificationListenerHeadlessJsName: string | undefined;

if (Platform.OS === 'android') {
  const listener = require('react-native-android-notification-listener');
  RNAndroidNotificationListener = listener.default;
  RNAndroidNotificationListenerHeadlessJsName = listener.RNAndroidNotificationListenerHeadlessJsName;
}

export class NotificationListener {
  private static isListening: boolean = false;

  /**
   * Initialize notification listener
   * Checks for 'Notification Access' permission and redirects user if needed.
   */
  static async initialize() {
    if (Platform.OS !== 'android') {
      console.log('[NotificationListener] Only supported on Android');
      return false;
    }

    try {
      // 1. Check if we have permission to listen
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      DevLogger.log('[NotificationListener] Permission status:', status);

      if (status === 'denied' || status === 'unknown') {
        // 2. If not, ask the user to enable it
        Alert.alert(
          'Memento Needs Access',
          'To automatically create tasks from your notifications (like \'Bill Due\'), Memento needs \'Notification Access\'.\n\nPlease find \'Memento\' in the list and enable it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => RNAndroidNotificationListener.requestPermission() 
            }
          ]
        );
        return false;
      }

      // 3. If granted, we are good to go.
      if (!this.isListening) {
        DevLogger.log('[NotificationListener] Listener initialized and ready.');
        this.isListening = true;
        
        // Start listening for foreground events to show in Dev Console
        this.listen();
      }

      return true;

    } catch (error) {
      DevLogger.log('[NotificationListener] Error initializing:', error);
      return false;
    }
  }

  /**
   * Listen for notifications in the foreground (UI Thread)
   * This allows us to show them in the Dev Console while the app is open.
   */
  static listen() {
    DeviceEventEmitter.addListener('notificationReceived', (notificationData: any) => {
      // Log the full raw notification for debugging
      DevLogger.log('[Notification] RAW received:', { type: typeof notificationData, data: notificationData });
      
      // The notification comes as a JSON string from the native module
      let notification: any = notificationData;
      if (typeof notificationData === 'string') {
        try {
          notification = JSON.parse(notificationData);
          DevLogger.log('[Notification] Parsed from string:', notification);
        } catch (e) {
          DevLogger.log('[Notification] Failed to parse JSON:', e);
          return;
        }
      }
      
      const { title, text, app } = notification || {};
      // Note: The package uses 'app' not 'packageName'
      const packageName = app || notification?.packageName;
      
      // Ignore self
      if (packageName === 'com.memento.app') return;

      DevLogger.log(`[Notification] Parsed - App: ${packageName || 'unknown'}`, { title: title || '(empty)', text: text || '(empty)' });

      // Send to MCP Server via Bridge
      CloudConnector.sendNotification({
          appName: packageName,
          title: title,
          content: text,
          timestamp: new Date().toISOString()
      });

      // We can also process tasks here if we want immediate UI updates, 
      // but the Headless task usually handles the actual logic.
      // For now, we just log it so the user sees it.
      
      if (LocalIntelligence.isNoise(title, text)) {
        DevLogger.log('[Notification] Identified as Noise (Ignored)');
      } else if (TaskProcessor.shouldCreateTask(title, text)) {
        DevLogger.log('[Notification] MATCH! Creating Task...');
      } else {
        DevLogger.log('[Notification] No task keywords found.');
      }
    });
  }
}

/**
 * This function handles notifications when the app is in the background or killed.
 * It must be registered in your index.js or App.tsx
 * 
 * IMPORTANT: The `notification` parameter is a JSON STRING, not an object!
 * Format: { time, app, title, titleBig, text, subText, summaryText, bigText, ... }
 */
export const notificationHeadlessTask = async ({ notification }: { notification: string }) => {
  try {
    console.log('[Headless] Received notification:', typeof notification, notification);
    
    if (!notification) {
      console.log('[Headless] No notification data');
      return;
    }

    // Parse the JSON string
    let parsed: any;
    try {
      parsed = JSON.parse(notification);
    } catch (e) {
      console.error('[Headless] Failed to parse notification JSON:', e);
      return;
    }

    console.log('[Headless] Parsed notification:', JSON.stringify(parsed, null, 2));

    const { title, text, app, time } = parsed;
    
    // Ignore our own notifications to prevent loops
    if (app === 'com.memento.app') {
      console.log('[Headless] Ignoring self notification');
      return;
    }

    console.log(`[Headless] Processing notification from ${app}: ${title}`);

    // Send to MCP Server via Bridge
    const sent = await CloudConnector.sendNotification({
        appName: app || 'unknown',
        title: title || 'No title',
        content: text || '',
        timestamp: time ? new Date(parseInt(time)).toISOString() : new Date().toISOString()
    });
    
    console.log(`[Headless] Notification sent to bridge: ${sent}`);

    // 1. Check if it's noise
    if (LocalIntelligence.isNoise(title, text)) {
      console.log('[Headless] Identified as noise, skipping task creation');
      return;
    }

    // 2. Check if it should be a task
    if (TaskProcessor.shouldCreateTask(title, text)) {
      const taskTitle = TaskProcessor.extractTaskTitle(text);
      const category = TaskProcessor.categorizeNotification(title, text, app);
      
      // 3. Create the task
      await TaskManager.addTask({
        title: taskTitle,
        description: `From ${app}: ${title} - ${text}`,
        completed: false,
        date: new Date().toLocaleDateString(),
        source: app,
        category: category,
        priority: TaskProcessor.determinePriority(title, text)
      });
      
      console.log(`[Headless] Created task from ${app}`);
    }
  } catch (error) {
    console.error('[Headless] Error processing notification:', error);
  }
};
