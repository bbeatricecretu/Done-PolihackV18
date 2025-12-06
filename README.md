# Memento - Intelligent Task Management

## Overview

Memento is an intelligent task management app that automatically captures notifications from your phone and converts them into actionable tasks using AI.

## Architecture

- **Frontend:** React + Vite (web UI simulator)
- **Mobile:** React Native + Expo (Android APK with notification access)
- **Backend:** Node.js + Express (local server)
- **AI Agent:** Azure AI Foundry (GPT-4o) with custom MCP server
- **Database:** Azure SQL Database

## Quick Start

### 1. Start the Backend

```bash
# Windows
start_backend.bat

# Or manually
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:3000`

### 2. Run the Mobile App

**Option A: Android Emulator**
```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android emulator
```

**Option B: Build APK for Physical Device** (Required for notification access)
```bash
cd mobile
npm install
npm run build:android
```

See `mobile/BUILD_GUIDE.md` for detailed APK build instructions.

### 3. Run the Web Frontend

```bash
# Windows
run_app.bat

# Or manually
cd frontend
npm install
npm run dev
```

## Notification Format

The mobile app sends notifications to the backend in the following format:

```json
{
  "source_app": "WhatsApp",
  "title": "John Doe",
  "body": "Meeting tomorrow at 3pm",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

The backend processes these and decides whether to create a task.

## Project Structure

```
NoAIUsed/
├── frontend/          # React web app (UI simulator)
├── mobile/            # React Native mobile app
├── backend/           # Node.js backend server
│   ├── src/
│   │   ├── index.ts        # Main server
│   │   └── routes/
│   │       ├── ingest.ts   # Notification processing
│   │       └── tasks.ts    # Task management
│   ├── QUICKSTART.md       # Backend setup guide
│   └── package.json
├── start_backend.bat  # Quick backend starter
└── run_app.bat        # Quick frontend starter
```

## Documentation

- **Backend Setup:** `backend/QUICKSTART.md`
- **APK Building:** `mobile/BUILD_GUIDE.md`
- **Architecture:** `backend/ARCHITECTURE.md`
- **MCP Server:** `backend/README.md`

## Current Status

✅ **Completed:**
- Mobile notification capture service
- Local backend with notification ingestion
- Basic task detection logic
- APK build configuration

🔨 **In Progress:**
- Azure AI Foundry integration
- MCP server implementation
- Azure SQL Database connection

## Testing

1. Start the backend: `start_backend.bat`
2. Build and install the mobile APK
3. Grant notification permissions
4. Send yourself a test message (WhatsApp, SMS, etc.)
5. Check backend logs to see if the notification was processed

## Contributing

This is a personal project. Feel free to fork and adapt for your needs.