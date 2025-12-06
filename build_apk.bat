@echo off
echo ==========================================
echo      Memento APK Builder
echo ==========================================
echo.
echo This script will build an APK with notification permissions.
echo Expo Go does NOT support notification listener permissions.
echo.

cd mobile

echo [STEP 1/4] Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)
echo ✓ Node.js found

echo.
echo [STEP 2/4] Checking for EAS CLI...
call npx eas-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing EAS CLI...
    call npm install -g eas-cli
)
echo ✓ EAS CLI ready

echo.
echo [STEP 3/4] Installing dependencies...
if not exist node_modules (
    call npm install
)
echo ✓ Dependencies installed

echo.
echo [STEP 4/4] Building APK...
echo.
echo Choose build option:
echo 1. Cloud build (requires Expo account, free tier available)
echo 2. Local build (requires Android SDK installed)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting CLOUD BUILD...
    echo You may need to login to your Expo account.
    echo.
    call npx eas-cli build --platform android --profile preview
    echo.
    echo ✓ Build started! Check status at: https://expo.dev/accounts/[your-account]/projects/memento-mobile/builds
    echo The APK will be available for download when build completes.
) else if "%choice%"=="2" (
    echo.
    echo Starting LOCAL BUILD...
    echo NOTE: This requires Android SDK to be installed.
    echo If you don't have it, choose option 1 instead.
    echo.
    call npx eas-cli build --platform android --profile preview --local
    echo.
    echo ✓ APK built locally! Check the mobile folder for the APK file.
) else (
    echo Invalid choice. Please run the script again.
    pause
    exit /b
)

echo.
echo ==========================================
echo      Build Process Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Transfer the APK to your Android device
echo 2. Install the APK (enable "Install from unknown sources")
echo 3. Grant notification permissions when prompted
echo 4. The app will now be able to read notifications!
echo.
pause
