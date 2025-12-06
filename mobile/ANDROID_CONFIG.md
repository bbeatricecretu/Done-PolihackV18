# Android Native Configuration for Notification Listener

## AndroidManifest.xml Additions

When building the APK, these permissions and services are automatically added from `app.json`. If you need to manually configure, add these to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <!-- Notification Permissions -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  
  <!-- Internet for backend communication -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  
  <application>
    <!-- Notification Listener Service -->
    <service
      android:name=".NotificationListenerService"
      android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
      android:exported="true">
      <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
      </intent-filter>
    </service>
  </application>
</manifest>
```

## Testing Notification Access

### Check Permission Status
```typescript
import * as Notifications from 'expo-notifications';

const { status } = await Notifications.getPermissionsAsync();
console.log('Notification permission:', status);
// Expected: "granted"
```

### Request Permission
```typescript
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission denied', 'Cannot access notifications');
}
```

### Enable in Android Settings
1. **Settings** → **Apps** → **Memento**
2. **Permissions** → **Notifications** → **Allow**
3. **Special app access** → **Notification access** → **Memento** → **Allow**

## Debugging Notification Capture

### Enable Logging
```typescript
// In NotificationListener.ts
console.log('[NotificationListener] Received notification:', {
  title,
  body,
  appName,
  timestamp: new Date().toISOString()
});
```

### View Logs via ADB
```bash
# Connect device via USB
adb logcat | grep "NotificationListener"

# Or filter for all Memento logs
adb logcat | grep "Memento"
```

### Test Notification
```bash
# Send test notification via ADB
adb shell am broadcast -a com.memento.app.TEST_NOTIFICATION --es title "Test" --es body "This is a test"
```

## Common Issues

### "Notification access not granted"
**Solution:**
1. Uninstall app
2. Reinstall APK
3. Grant permissions in Settings → Apps → Memento → Permissions

### "Notification listener not working"
**Solution:**
1. Check AndroidManifest.xml has NotificationListenerService
2. Verify BIND_NOTIFICATION_LISTENER_SERVICE permission
3. Enable in Settings → Special app access → Notification access

### "Permission denied"
**Solution:**
1. Check targetSdkVersion >= 33 for Android 13+
2. Add POST_NOTIFICATIONS permission for Android 13+
3. Request permission at runtime

## Testing Checklist

- [ ] APK installed successfully
- [ ] Notification permission granted in app
- [ ] Notification access enabled in Settings
- [ ] Test notification received and logged
- [ ] LocalIntelligence filters working
- [ ] Backend receives notification data
- [ ] Task created in database
- [ ] UI updates with new task

## Advanced: Custom Notification Listener

For more control, you can implement a native Android NotificationListenerService:

```java
// android/app/src/main/java/com/memento/NotificationListener.java
package com.memento.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class NotificationListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // Get notification details
        String packageName = sbn.getPackageName();
        String title = sbn.getNotification().extras.getString("android.title");
        String text = sbn.getNotification().extras.getString("android.text");
        
        // Send to React Native via event emitter
        // Implementation depends on your bridge setup
    }
    
    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Handle notification removal if needed
    }
}
```

## Resources

- [Android NotificationListenerService Docs](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- [Expo Notifications Guide](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Permissions](https://github.com/zoontek/react-native-permissions)
