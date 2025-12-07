# Done - Experiencing the world without overwhelming it.

> **Hackathon Project:** "Experiencing the world without overwhelming it."

Memento is not just another to-do list. It is an **Anti-To-Do List**. 

Traditional productivity apps act as storage bins for anxiety, showing you everything you haven't done yet. Memento acts as a **Context-Aware Filter**, hiding 90% of your tasks to reduce cognitive load and only showing you what is actionable **right now** based on your location, weather, and energy levels.

---

## 🚀 Key Features

### 1. 🧠 Context-Aware Task Filtering
Instead of a long list of unchecked boxes, Memento shows you tasks relevant to your current context.
- **Location:** "Buy Groceries" only appears when you are near a supermarket.
- **Weather:** "Wash Car" is hidden if it's raining.
- **Time:** "Call Mom" is suggested in the evening, not during work hours.

### 2. 📩 AI-Powered Notification Ingestion
Zero-friction entry. Memento listens to your Android notifications and uses AI to convert them into actionable tasks.
- *Example:* You receive a text: "Can you pay the electric bill?" -> Memento creates a task: **"Pay Electric Bill"** (High Priority).

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
# Create a .env file with DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME, COSMOS_ENDPOINT, COSMOS_KEY
node server.js
```

### 2. Setup MCP Server
```bash
cd mcp-server
npm install
npm run build
# Create a .env file with Azure credentials
npm run start:http
```

### 3. Run Mobile App
**Option A: Development (Expo Go)**
```bash
cd mobile
npm install
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

## 📱 Demo Flow (5 Minutes)

1.  **The Hook:** Show the "Anti-To-Do List" interface. It's calm and empty.
2.  **The Context Switch:** Walk to a specific location (or simulate it). Watch the app surface a relevant task (e.g., "Pick up package" when near the post office).
3.  **The Magic:** Send a dummy notification to the phone. Show Memento automatically parsing it and creating a prioritized task without you typing a word.

---

## 🛡️ Privacy & Philosophy

Memento is designed to help you experience the world, not just manage it. 
- **Local First:** Location data is processed locally where possible.
- **Curated Focus:** The AI acts as a filter, not a boss. You can always access your full list in the "Brain Dump" drawer.
