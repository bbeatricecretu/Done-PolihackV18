/**
 * NotificationListener Service
 * 
 * This service listens to all device notifications and processes them
 * through LocalIntelligence before sending to backend.
 * 
 * USES: react-native-android-notification-listener
 */

import { Platform, Alert, Linking, DeviceEventEmitter } from 'react-native';
import RNAndroidNotificationListener, { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import { LocalIntelligence } from './LocalIntelligence';
import { TaskProcessor } from './TaskProcessor';
import { TaskManager } from './TaskManager';
import { DevLogger } from './DevLogger';

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
    DeviceEventEmitter.addListener('notificationReceived', (notification: any) => {
      const { title, text, packageName } = notification;
      
      // Ignore self
      if (packageName === 'com.memento.app') return;

      DevLogger.log(`[Notification] Received from ${packageName}`, { title, text });

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
 */
export const notificationHeadlessTask = async ({ notification }: any) => {
  try {
    if (!notification) return;

    const { title, text, packageName, time } = notification;
    
    // Ignore our own notifications to prevent loops
    if (packageName === 'com.memento.app') return;

    // 1. Check if it's noise
    if (LocalIntelligence.isNoise(title, text)) {
      return;
    }

    // 2. Check if it should be a task
    if (TaskProcessor.shouldCreateTask(title, text)) {
      const taskTitle = TaskProcessor.extractTaskTitle(text);
      const category = TaskProcessor.categorizeNotification(title, text, packageName);
      
      // 3. Create the task
      await TaskManager.addTask({
        title: taskTitle,
        description: `From ${packageName}: ${title} - ${text}`,
        completed: false,
        date: new Date().toLocaleDateString(),
        source: packageName,
        category: category,
        priority: TaskProcessor.determinePriority(title, text)
      });
      
      console.log(`[Headless] Created task from ${packageName}`);
    }
  } catch (error) {
    console.error('[Headless] Error processing notification:', error);
  }
};
