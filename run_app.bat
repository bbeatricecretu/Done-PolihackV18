@echo off
echo ==========================================
echo      Memento App Launcher
echo ==========================================

echo Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found in PATH. Checking default install location...
    if exist "C:\Program Files\nodejs\node.exe" (
        echo Found Node.js at "C:\Program Files\nodejs\"
        set "PATH=%PATH%;C:\Program Files\nodejs\"
    ) else (
        echo [ERROR] Node.js is not found!
        echo.
        echo Please install Node.js from https://nodejs.org/
        echo 1. Download the LTS version.
        echo 2. Install it.
        echo 3. Restart VS Code or this terminal.
        echo.
        pause
        exit /b
    )
)

echo Node.js found.
echo.

cd mobile

if not exist node_modules (
    echo [INFO] First time setup: Installing dependencies...
    echo This might take a few minutes.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
)

echo.
echo [SUCCESS] Starting Memento Mobile...
echo.
echo 1. Open the "Expo Go" app on your phone.
echo 2. Scan the QR code below.
echo.

echo Clearing Expo cache...
if exist .expo rd /s /q .expo
call npx expo start --clear
pause
