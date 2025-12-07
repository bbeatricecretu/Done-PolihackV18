import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import App from './App';
import { notificationHeadlessTask } from './src/services/NotificationListener';

// Background location task name
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Define the background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Background Location] Error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      console.log('[Background Location] New location:', location.coords.latitude, location.coords.longitude);
      
      try {
        // Import dynamically to avoid circular dependencies
        const { syncLocation } = require('./src/services/CloudSync');
        const { default: ProximityNotificationService } = require('./src/services/ProximityNotificationService');
        
        // Sync location with backend
        await syncLocation(location.coords.latitude, location.coords.longitude);
        
        // Check for proximity notifications
        if (ProximityNotificationService && typeof ProximityNotificationService.checkForProximityNotifications === 'function') {
          // This is handled by polling, but we can trigger an immediate check
          console.log('[Background Location] Location synced successfully');
        }
      } catch (err) {
        console.error('[Background Location] Error syncing location:', err);
      }
    }
  }
});

// Register the Headless Task FIRST, before registerRootComponent
// This is critical for background notification listening
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName, 
  () => notificationHeadlessTask
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
