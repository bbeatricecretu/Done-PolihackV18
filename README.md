# Done– Context Aware Task Manager

Traditional productivity apps act as storage bins for anxiety, showing you everything you haven't done yet. Done — an app developed in 48 hours at Polihack v18 in a 5-member team — is a context-aware task manager that filters tasks and notifications to show only what’s actionable based on location, weather, and energy level, hiding 90% of your tasks to reduce cognitive load. We  won 1st place at AppDev category and we were qualified for the *Innovation Labs 2026* national stage.

> **AppDev Theme:** "Experiencing the world without overwhelming it."
---

## 🚀 Key Features

### 1. 🧠 Context-Aware Task Filtering
Instead of a long list of unchecked boxes, Dond shows you tasks relevant to your current context.
- **Location:** "Buy Groceries" only appears when you are near a supermarket.
- **Weather:** "Wash Car" is hidden if it's raining.
- **Time:** "Call Mom" is suggested in the evening, not during work hours.

### 2. 📩 AI-Powered Notification Ingestion
Zero-friction entry. Done listens to your Android notifications and uses AI to convert them into actionable tasks.
- *Example:* You receive a text: "Can you pay the electric bill?" -> Done creates a task: **"Pay Electric Bill"** (High Priority).

### 3. 🤖 Intelligent Suggestions (MCP)
Powered by a **Model Context Protocol (MCP)** server connected to Azure AI Foundry (GPT-4o).
- The AI Agent analyzes your tasks and your environment to proactively suggest the *single best thing* to do right now.

---

## 🏗️ System Architecture

The project consists of three main components working in harmony:

1.  **Mobile App (`/mobile`)**: 
    - Built with **React Native** & **Expo**.
    - Handles UI, Location Tracking, and Android Notification Listening.
    - Communicates with the backend bridge.

2.  **Backend Bridge (`/local-sql-bridge`)**:
    - **Node.js** & **Express** server.
    - Acts as the API gateway between the mobile app and the database.
    - Manages the connection to **Azure SQL Database**.
    - Orchestrates the AI Agent service.

3.  **AI Layer (`/mcp-server`)**:
    - Implements the **Model Context Protocol (MCP)**.
    - Provides "Tools" to the Azure AI Agent (e.g., `create_task_from_notification`, `suggest_tasks_by_context`).
    - Connects to **Azure Cosmos DB** for raw notification logs.

---

## 📂 Project Structure

```
NoAIUsed/
├── mobile/                 # React Native Android App
│   ├── src/components/     # UI Screens (LocationsPage, TasksPage)
│   ├── src/services/       # Background services (Location, Notifications)
│   └── android/            # Native Android code
├── local-sql-bridge/       # Main Backend API
│   ├── server.js           # Express Server
│   ├── ai-agent-service.js # Azure AI Integration
│   └── create_locations_table.sql
├── mcp-server/             # Model Context Protocol Server
│   ├── src/index.ts        # Tool definitions for AI
│   └── IMPLEMENTATION_SUMMARY.md
├── idea.md                 # Core philosophy and design doc
└── README.md               # This file
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- JDK 17 (for Android build)
- Android Studio & SDK (for Emulator/APK)
- Azure SQL Database & Cosmos DB credentials

### 1. Setup Backend Bridge
```bash
cd local-sql-bridge
npm install
# Copy .env.example to .env
# Edit .env with your Azure SQL & Cosmos DB credentials
node server.js
```

### 2. Setup MCP Server
```bash
cd mcp-server
npm install
npm run build
# Copy .env.example to .env
# Edit .env with your Azure credentials
npm run start:http
```

### 3. Setup & Run Mobile App
```bash
cd mobile
npm install

# Setup Config (IMPORTANT)
# Copy src/config/secrets.example.ts to src/config/secrets.ts
# Edit src/config/secrets.ts to add your Google Places API Key
```

**Option A: Development (Expo Go)**
```bash
npx expo start
```

**Option B: Build APK (Required for Notification Access)**
```bash
cd mobile
# Ensure JAVA_HOME is set to JDK 17
./clean_and_build.ps1
# Install the generated APK on your device
```

---

## 📺 Demo

[**▶️ Watch the Demo Video on YouTube**](https://youtu.be/GKBEBxHppGU?feature=shared)

---
