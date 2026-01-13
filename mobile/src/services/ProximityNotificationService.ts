import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_CONFIG } from '../config/constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ProximityNotification {
  id: string;
  task_id: string;
  title: string;
  body: string;
  priority: string;
  distance: number;
  location_name: string;
  timestamp: number;
}

class ProximityNotificationService {
  private isInitialized = false;
  private pollInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[ProximityNotifications] Permission not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('proximity', {
          name: 'Proximity Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      console.log('[ProximityNotifications] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ProximityNotifications] Initialization failed:', error);
      return false;
    }
  }

  async startPolling() {
    if (!this.isInitialized) {
      console.log('[ProximityNotifications] Not initialized, skipping polling');
      return;
    }

    // Clear any existing interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Poll every 5 seconds
    this.pollInterval = setInterval(() => {
      this.checkForProximityNotifications();
    }, 5000);

    // Immediate check
    this.checkForProximityNotifications();
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkForProximityNotifications() {
    try {
      const storedIp = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_IP);
      if (!storedIp) {
        return;
      }

      const apiBase = `http://${storedIp}:${DEFAULT_CONFIG.PORT}/api`;
      const response = await fetch(`${apiBase}/proximity-notifications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('[ProximityNotifications] Failed to fetch:', response.status);
        return;
      }

      const data = await response.json();
      const notifications: ProximityNotification[] = data.notifications || [];

      if (notifications.length > 0) {
        console.log(`[ProximityNotifications] Received ${notifications.length} proximity alerts`);
        
        for (const notif of notifications) {
          await this.showProximityNotification(notif);
        }
      }
    } catch (error) {
      console.error('[ProximityNotifications] Error checking notifications:', error);
    }
  }

  private async showProximityNotification(notif: ProximityNotification) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          data: { 
            task_id: notif.task_id,
            distance: notif.distance,
            location_name: notif.location_name,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });

      console.log(`[ProximityNotifications] Displayed: ${notif.title}`);
    } catch (error) {
      console.error('[ProximityNotifications] Error showing notification:', error);
    }
  }

  // Handle notification tap (navigate to task)
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new ProximityNotificationService();
