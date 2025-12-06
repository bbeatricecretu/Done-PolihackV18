# Building Memento APK - Quick Start

## Why You Need This

**Expo Go cannot access device notifications!** To implement Memento's core feature (learning from notifications), you must build a standalone APK.

## Build the APK (2 Options)

### Option 1: Cloud Build (Easiest - Recommended)
```bash
# From project root
.\build_apk.bat
# Choose option 1 when prompted
```

**Requirements:**
- Node.js installed ✅
- Internet connection ✅
- Free Expo account (sign up at expo.dev)

**Time:** ~10-15 minutes (including queue time)

### Option 2: Local Build (Advanced)
```bash
# From project root
.\build_apk.bat
# Choose option 2 when prompted
```

**Requirements:**
- Node.js installed ✅
- Android SDK installed ⚠️
- Java JDK installed ⚠️
- 8GB+ RAM available

**Time:** ~5-10 minutes

## First Time Setup

1. **Install EAS CLI** (if not already):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   npx eas-cli login
   ```

3. **Run build script**:
   ```bash
   .\build_apk.bat
   ```

## After Building

### Cloud Build
1. QR code will appear in terminal
2. Scan QR code with phone to download APK
3. OR visit expo.dev → Your Projects → Builds → Download

### Local Build
1. APK file will be in `mobile/` folder
2. Transfer to your Android phone
3. Install the APK

## Installing APK on Phone

1. **Transfer APK** to phone (USB, email, cloud)
2. **Open APK** file on phone
3. **Enable "Install from unknown sources"** if prompted
4. **Install** the app
5. **Open Memento**
6. **Grant notification permission** when prompted
7. **Go to Settings → Apps → Memento → Notifications**
8. **Enable "Notification Access"** ✅

## Testing Notification Capture

1. Open Memento app
2. Send yourself a test notification (WhatsApp, email, etc.)
3. Check console logs or backend for captured notification
4. Verify task was created

## Troubleshooting

**"EAS CLI not found"**
```bash
npm install -g eas-cli
```

**"Android SDK not found"** (Local build only)
→ Use cloud build instead (option 1)

**"Build failed"**
→ Check terminal output for error
→ Try cloud build if local build fails

**"Permissions not working"**
1. Uninstall app completely
2. Reinstall APK
3. Grant permissions again
4. Restart phone if needed

## What's Configured

✅ Notification permissions in `app.json`  
✅ Build profiles in `eas.json`  
✅ NotificationListener service  
✅ LocalIntelligence filtering  
✅ CloudConnector integration  

## Next Steps

After successful APK installation:

1. ✅ Test notification capture
2. ✅ Verify LocalIntelligence filters work
3. ✅ Check backend receives notifications
4. ✅ Verify AI agent creates tasks
5. ✅ Test context-aware suggestions

## Need Help?

- Build guide: `mobile/BUILD_GUIDE.md`
- EAS docs: https://docs.expo.dev/build/introduction/
- Expo forums: https://forums.expo.dev/

## Development Workflow

**For UI/Layout changes:**
```bash
npm run start  # Use Expo Go (faster)
```

**For notification testing:**
```bash
npm run build:android:apk  # Build APK with latest changes
# Install on device and test
```

---

**Quick Command Reference:**

```bash
# Cloud build (recommended)
cd mobile
npx eas-cli build --platform android --profile preview

# Local build
cd mobile
npx eas-cli build --platform android --profile preview --local

# Check build status
npx eas-cli build:list
```
