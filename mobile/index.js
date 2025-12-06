import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import App from './App';
import { notificationHeadlessTask } from './src/services/NotificationListener';

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
