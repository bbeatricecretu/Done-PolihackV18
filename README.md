# **Done --- The Task Manager That Helps You Focus**

Done is an AI-powered task manager created during **Polihack v18**,
designed to reduce overwhelm.\
Instead of dumping dozens of tasks on you, Done highlights only the next
most important one --- based on context, deadlines, notifications, and
intelligent filtering.

------------------------------------------------------------------------

## 🚀 **Why Us**

Most productivity apps overload users with:
- too many lists
- too many notifications
- too many decisions

Done solves the real problem:
**not information overload --- but timing overload.**

You don't get stressed because you have tasks.
You get stressed because they hit you at the wrong moment.

Done fixes that automatically.

------------------------------------------------------------------------

# ✨ **Core Features**

## 🏠 1. **Smart Home Page**

The home screen shows:
- **one** relevant task
- selected using AI reasoning
- based on urgency, context, history, and deadlines

You always know what to do next.

------------------------------------------------------------------------

## 💬 2. **AI Chat Box (Azure Agent)**

A conversational assistant that can: 
- create tasks
- edit tasks
- update deadlines
- delete tasks
- search and filter
- understand natural language

Hosted on Azure AI Foundry with a custom MCP server.

------------------------------------------------------------------------

## 📋 3. **Manual Task Management**

For users who want full control: 
- complete task list
- sorting and filtering
- full CRUD
- clean UI pages

Still aligned with the "one task at a time" philosophy.

------------------------------------------------------------------------

## 🔔 4. **Notification Intelligence**

Done reads your smartphone notifications and transforms them into tasks
automatically.

The AI can: 
- detect meaningful reminders
- merge similar notifications
- fill in missing information (dates, names, context)
- avoid duplicates

**Example:**
Two banking notifications → one clear "Pay rent" task.

------------------------------------------------------------------------

## 📍 5. **Location-Aware Tasks**

After adding a task, Done can: 
- search Google Maps API
- suggest nearby locations
- link real places to real tasks

**Example:** Add "Pick up package" → Done suggests the nearest Posta
Română.

------------------------------------------------------------------------

# 🧠 **Architecture**

  -----------------------------------------------------------------------
  Layer                                     Technology
  ----------------------------------------- -----------------------------
  **Frontend**                              React + Vite

  **Mobile App**                            React Native + Expo (APK
                                            required for notification
                                            access)

  **Backend**                               Node.js + Express

  **AI System**                             Azure AI Foundry (GPT‑4o) +
                                            custom MCP server

  **Database**                              Azure SQL Database



# 🛠️ **Quick Start**

## ▶️ Backend

``` bash
cd backend
npm install
npm run dev
```

## 📱 Mobile (APK Build)

``` bash
cd mobile
npm install
npm run build:android
```

Install APK → enable notification access.

## 💻 Frontend

``` bash
cd frontend
npm install
npm run dev
```

------------------------------------------------------------------------

# 🔄 **Notification Payload Example**

``` json
{
  "source_app": "WhatsApp",
  "title": "John Doe",
  "body": "Meeting tomorrow at 3pm",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

------------------------------------------------------------------------

# 📂 **Project Structure**

    Done/
    ├── backend/
    │   ├── src/
    │   │   ├── index.ts
    │   │   └── routes/
    │   │       ├── ingest.ts
    │   │       └── tasks.ts
    │   └── QUICKSTART.md
    ├── mobile/
    │   ├── src/
    │   ├── app/
    │   └── build/
    └── frontend/
        ├── src/
        └── vite.config.js

------------------------------------------------------------------------

# 🧪 **Testing**

1.  Start backend
2.  Install the APK
3.  Allow notification access
4.  Trigger a real notification
5.  Watch backend logs
6.  Open the app to see the generated task

------------------------------------------------------------------------

# 🔮 **Future Improvements**

-   smart schedule planning
-   cross-device sync
