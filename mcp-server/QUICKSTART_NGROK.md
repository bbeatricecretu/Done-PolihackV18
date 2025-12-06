# Quick Start: MCP Server with Ngrok + Azure AI Foundry

## 🚀 Setup in 5 Minutes

### 1. Install Ngrok
```powershell
# Using Chocolatey
choco install ngrok

# OR download from https://ngrok.com/download
```

### 2. Get Ngrok Auth Token
1. Sign up at https://dashboard.ngrok.com/signup
2. Copy your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

### 3. Configure `.env`
```powershell
cd C:\Users\2Usi\Desktop\NoAIUsed\mcp-server
notepad .env
```

Update these lines:
```env
NGROK_AUTH_TOKEN=your_auth_token_here
MCP_API_KEY=change-to-strong-password
```

### 4. Install Dependencies
```powershell
npm install
```

### 5. Start Everything
```powershell
.\start-with-ngrok.ps1
```

You'll see:
```
✅ MCP Server is running!

📍 Local URL:  http://localhost:3001
🌍 Ngrok URL:  https://abc-123.ngrok-free.app

📋 Next Steps:
   1. Copy the ngrok HTTPS URL
   2. Go to Azure AI Foundry
   3. Add MCP server with that URL
```

### 6. Copy Ngrok URL

Look for the "Forwarding" line:
```
Forwarding   https://abc-123.ngrok-free.app -> http://localhost:3001
```

Copy: `https://abc-123.ngrok-free.app`

### 7. Configure Azure AI Foundry

Go to https://ai.azure.com → Your Project → Settings → Add MCP Server:

```
Name: task-management-mcp
URL: https://abc-123.ngrok-free.app
API Key: [value from MCP_API_KEY in .env]
```

### 8. Test It!

```powershell
# Add test notifications
cd ..\local-sql-bridge
node add-test-notification.js 4

# Call agent to process them
cd ..\mcp-server
node call-agent-api.js
```

---

## 📞 Calling Agent via API

The agent can now be called directly using REST API:

```javascript
const response = await fetch(
  'https://polihack.openai.azure.com/openai/deployments/polihack/chat/completions?api-version=2024-08-01-preview',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': 'your-api-key'
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Check for new notifications and create tasks'
        }
      ],
      tools: [/* MCP tools */]
    })
  }
);
```

Use the provided script:
```powershell
node call-agent-api.js
```

---

## 🔧 Architecture

```
Mobile App
    ↓
Local SQL Bridge → CosmosDB (notifications)
    ↓                          ↓
API Call → Azure AI Agent → Ngrok → MCP Server → Azure SQL
                                         ↓
                                    Your Tools
```

---

## 🛠️ Available Commands

```powershell
# Start MCP server with ngrok
.\start-with-ngrok.ps1

# Call agent to process notifications
node call-agent-api.js

# Check MCP server locally (without ngrok)
npm run start:http

# Build MCP server
npm run build
```

---

## ⚠️ Important Notes

1. **Ngrok URL Changes**: Free plan URL changes when you restart. Update Azure AI Foundry each time, or upgrade to paid plan for fixed domain.

2. **API Key Security**: Change `MCP_API_KEY` to something secure in production.

3. **Keep Running**: Both MCP server and ngrok must stay running while Azure AI Foundry uses the tools.

4. **Web Dashboard**: Monitor requests at http://127.0.0.1:4040

---

## 📚 Full Documentation

- **NGROK_SETUP.md** - Complete ngrok setup guide
- **IMPLEMENTATION_SUMMARY.md** - MCP server tools documentation
- **NOTIFICATION_WORKFLOW.md** - How notifications flow through system

---

## 🐛 Troubleshooting

### MCP Server won't start
```powershell
# Check .env is configured
cat .env

# Rebuild
npm run build

# Check logs
npm run start:http
```

### Ngrok not found
```powershell
# Install ngrok
choco install ngrok

# Or download: https://ngrok.com/download
```

### Azure AI can't connect
- Verify ngrok is running: http://127.0.0.1:4040
- Check API key matches in .env
- Test locally: `curl http://localhost:3001`

---

## ✅ Success!

Once setup, your agent can:
- ✅ Access all MCP tools
- ✅ Process notifications automatically
- ✅ Create/edit/delete tasks intelligently
- ✅ Detect duplicates
- ✅ Handle context from previous notifications

🎉 You're ready to go!
