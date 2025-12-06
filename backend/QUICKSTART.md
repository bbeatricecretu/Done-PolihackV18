# Memento Backend - Quick Start Guide

## Overview

This is the **local Node.js backend** for the Memento app. It runs on your development machine and:

1. ✅ **Receives notifications** from the mobile app
2. 🤖 **Processes through AI** (Azure AI Foundry + MCP) - *Coming soon*
3. 💾 **Manages tasks** in Azure SQL Database - *Coming soon*
4. 📡 **Provides API** for mobile app to fetch tasks

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The `.env` file is already configured for local development. For Azure integration later:

```bash
# Copy example and fill in your Azure credentials
cp .env.example .env
```

### 3. Start the Server

```bash
npm run dev
```

You should see:

```
╔════════════════════════════════════════════════════╗
║         Memento Backend Server Started            ║
╠════════════════════════════════════════════════════╣
║  Port:        3000                                 ║
║  Environment: development                          ║
║  Health:      http://localhost:3000/health         ║
╠════════════════════════════════════════════════════╣
║  Endpoints:                                        ║
║  POST /api/ingest/notification                     ║
║  POST /api/ingest/chat                             ║
║  GET  /api/tasks                                   ║
╚════════════════════════════════════════════════════╝

✓ Ready to receive notifications from mobile app
```

---

## 📡 API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "service": "memento-backend",
  "version": "1.0.0"
}
```

---

### Receive Notification
```http
POST /api/ingest/notification
Content-Type: application/json

{
  "source_app": "WhatsApp",
  "title": "John Doe",
  "body": "Meeting tomorrow at 3pm",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

**Response (Task Created):**
```json
{
  "success": true,
  "action": "task_created",
  "task": {
    "id": "task_1733487000_abc123",
    "title": "Meeting tomorrow at 3pm",
    "description": "Meeting tomorrow at 3pm",
    "category": "general",
    "priority": "medium",
    "source": "notification",
    "source_app": "WhatsApp",
    "created_at": "2025-12-06T10:30:00.000Z"
  },
  "message": "Task created successfully"
}
```

**Response (Ignored):**
```json
{
  "success": true,
  "action": "ignore",
  "message": "Notification does not require task creation"
}
```

---

### Send Chat Message
```http
POST /api/ingest/chat
Content-Type: application/json

{
  "message": "Add a task to buy groceries tomorrow",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

---

### Fetch Tasks
```http
GET /api/tasks
```

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task_1733487000_abc123",
      "title": "Meeting tomorrow at 3pm",
      "description": "Meeting tomorrow at 3pm",
      "category": "general",
      "priority": "medium",
      "created_at": "2025-12-06T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 🔗 Connecting Mobile App

### For Android Emulator

The mobile app is configured to use `http://localhost:3000`. This works automatically in the emulator.

### For Physical Android Device

You need to use your computer's local IP address:

1. **Find your local IP:**

   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.100)
   ```

2. **Update CloudConnector in mobile app:**

   Edit `mobile/src/services/CloudConnector.ts`:

   ```typescript
   const BACKEND_URL = 'http://192.168.1.100:3000';
   ```

3. **Ensure both devices are on the same Wi-Fi network**

---

## 📦 Project Structure

```
backend/
├── src/
│   ├── index.ts           # Main server entry point
│   └── routes/
│       ├── ingest.ts      # Notification & chat ingestion
│       └── tasks.ts       # Task CRUD operations
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config
├── .env                   # Environment variables
└── .env.example           # Example env config
```

---

## 🧪 Testing the Backend

### 1. Test Health Check

```bash
curl http://localhost:3000/health
```

### 2. Send a Test Notification

```bash
curl -X POST http://localhost:3000/api/ingest/notification \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "WhatsApp",
    "title": "Test",
    "body": "Meeting tomorrow at 3pm",
    "timestamp": "2025-12-06T10:30:00.000Z"
  }'
```

### 3. Fetch Tasks

```bash
curl http://localhost:3000/api/tasks
```

---

## 🚧 Current Status

✅ **Working:**
- ✓ Notification ingestion endpoint
- ✓ Basic task storage (in-memory)
- ✓ Simple keyword-based task detection
- ✓ Health check endpoint

🔨 **Coming Soon:**
- ⏳ Azure AI Foundry integration (GPT-4o)
- ⏳ MCP server connection
- ⏳ Azure SQL Database integration
- ⏳ Azure Maps weather API
- ⏳ Microsoft Graph calendar integration

---

## 🔧 Development

### Watch Mode (Auto-reload)

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### View Logs

The server logs all incoming requests and actions:

```
[Ingest] Received notification:
  App:   WhatsApp
  Title: John Doe
  Body:  Meeting tomorrow at 3pm
  Time:  2025-12-06T10:30:00.000Z
[Ingest] ✓ Task created: Meeting tomorrow at 3pm
```

---

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is taken:

```bash
# Edit .env
PORT=3001
```

### Mobile App Can't Connect

1. Check backend is running: `curl http://localhost:3000/health`
2. Verify firewall allows connections on port 3000
3. Ensure mobile device is on same Wi-Fi network
4. Use your local IP address (not `localhost`) for physical devices

### No Tasks Appearing

- Tasks are currently stored in-memory
- Restarting the server clears all tasks
- Azure SQL integration coming soon for persistent storage

---

## 📚 Next Steps

1. **Test the flow:** Build the mobile APK and test notification capture
2. **Azure AI Setup:** Configure Azure AI Foundry credentials in `.env`
3. **Database Setup:** Create Azure SQL Database and update connection string
4. **MCP Integration:** Implement MCP server connection
5. **Deploy (Optional):** Consider Azure App Service for remote hosting

---

## 📝 Notes

- This backend runs **locally** during development
- It will later connect to **Azure services** (AI, Database, Maps)
- The mobile app sends notifications to this backend
- The backend will use **MCP** to communicate with the AI agent

For architecture details, see `ARCHITECTURE.md`.

---

## 🆘 Need Help?

Check the logs in the terminal where you ran `npm run dev`. All requests and errors are logged there.
