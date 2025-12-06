# Building Memento APK with Notification Support

## Why Build an APK?

**Expo Go does NOT support notification listener permissions.** To access device notifications and implement the core Memento functionality, you need to build a standalone APK.

## Prerequisites

### Option 1: Cloud Build (Recommended - Easier)
- Node.js installed
- Expo account (free tier available)
- Internet connection

### Option 2: Local Build (Advanced)
- Node.js installed
- Android SDK installed
- Java JDK installed
- 8GB+ RAM available

## Quick Start

### Method 1: Using the Build Script (Easiest)

```bash
# From the project root
.\build_apk.bat
```

Follow the prompts and choose:
- **Option 1 (Cloud)**: If you don't have Android SDK installed
- **Option 2 (Local)**: If you have Android SDK installed locally

### Method 2: Manual Build

#### Cloud Build
```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

#### Local Build
```bash
cd mobile
npx eas-cli build --platform android --profile preview --local
```

## First Time Setup

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   npx eas-cli login
   ```

3. **Configure Project** (already done in eas.json):
   ```bash
   npx eas-cli build:configure
   ```

## Build Profiles

### Preview (Default)
- For testing and development
- Generates APK file (easy to install)
- No signing required

```bash
npm run build:android:apk
```

### Production
- For Play Store submission
- Generates AAB file
- Requires signing key

```bash
npm run build:android:production
```

## Notification Permissions

The APK includes these Android permissions (configured in `app.json`):

```json
"permissions": [
  "READ_EXTERNAL_STORAGE",      // Read device storage
  "WRITE_EXTERNAL_STORAGE",     // Write to device storage
  "POST_NOTIFICATIONS",         // Post notifications
  "BIND_NOTIFICATION_LISTENER_SERVICE"  // Listen to notifications
]
```

### Granting Notification Access

After installing the APK:

1. Open the Memento app
2. Grant notification permission when prompted
3. Go to **Settings → Apps → Memento → Notifications**
4. Enable **"Notification access"** or **"Read notifications"**
5. Confirm the permission

## Installing the APK

### Method 1: Direct Install via USB
1. Connect Android device via USB
2. Enable USB debugging in Developer Options
3. Run: `adb install path/to/memento.apk`

### Method 2: Transfer and Install
1. Transfer APK to device (email, cloud, USB)
2. Open APK file on device
3. Enable "Install from unknown sources" if prompted
4. Install the app

### Method 3: Install via Expo
After cloud build completes:
1. Visit https://expo.dev
2. Navigate to your project builds
3. Download APK directly to device
4. Install

## Troubleshooting

### "EAS CLI not found"
```bash
npm install -g eas-cli
```

### "Android SDK not found" (Local Build)
You need Android Studio installed with Android SDK. Use cloud build instead.

### "Build failed - Out of memory"
Close other applications or use cloud build.

### "Permissions not working"
1. Uninstall the app completely
2. Reinstall APK
3. Grant all permissions when prompted
4. Go to Settings → Apps → Memento and verify permissions

### "Expo account required"
Create a free account at https://expo.dev/signup

## Build Times

- **Cloud Build**: 10-15 minutes (queue + build)
- **Local Build**: 5-10 minutes (first build may take longer)

## APK Location

### Cloud Build
- Download from: https://expo.dev/accounts/[your-account]/projects/memento-mobile/builds
- QR code provided in terminal

### Local Build
- Location: `mobile/build-[timestamp].apk`
- Also shown in terminal output

## Testing Notification Capture

After installing the APK:

1. Open Memento app
2. Grant all permissions
3. Send yourself a test notification (WhatsApp, email, etc.)
4. Check if Memento captures it
5. Verify LocalIntelligence filters work correctly

## Development Workflow

### During Development
```bash
# Use Expo Go for UI changes (faster)
npm run start
```

### For Testing Notifications
```bash
# Build APK with latest changes
npm run build:android:apk
# Install and test on device
```

## CI/CD Integration (Future)

For automated builds, you can integrate with GitHub Actions:

```yaml
# .github/workflows/build.yml
- name: Build APK
  run: |
    cd mobile
    npx eas-cli build --platform android --profile preview --non-interactive
```

## Cost

- **Expo Free Tier**: 30 builds/month (cloud)
- **Local Builds**: Free (unlimited)

## Next Steps

1. ✅ Run `.\build_apk.bat`
2. ✅ Install APK on Android device
3. ✅ Grant notification permissions
4. ✅ Test notification capture
5. ✅ Implement CloudConnector to send notifications to backend

## Resources

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Android Permissions Guide](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Notification Listener Service](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
