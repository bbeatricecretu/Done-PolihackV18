@echo off
echo ╔════════════════════════════════════════════════════╗
echo ║        Starting Memento Backend Server            ║
echo ╚════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0backend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    echo.
) else (
    echo [✓] Dependencies already installed
    echo.
)

echo [2/2] Starting development server...
echo.
call npm run dev
