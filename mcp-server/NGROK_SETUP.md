# Ngrok Setup Guide for MCP Server

## Overview

This guide shows you how to expose your local MCP server to Azure AI Foundry using ngrok.

## Why Ngrok?

Azure AI Foundry needs to connect to your MCP server over the internet. Ngrok creates a secure tunnel from the internet to your local machine, allowing Azure AI Foundry to call your MCP tools.

```
Azure AI Foundry → Ngrok (HTTPS) → Your Local MCP Server → Azure SQL/CosmosDB
```

---

## Step 1: Install Ngrok

### Option A: Download Installer
1. Go to https://ngrok.com/download
2. Download the Windows version
3. Extract `ngrok.exe` to a folder in your PATH

### Option B: Using Package Manager
```powershell
# Using Chocolatey
choco install ngrok

# Using Scoop
scoop install ngrok
```

### Verify Installation
```powershell
ngrok version
```

---

## Step 2: Sign Up for Ngrok (Free)

1. Go to https://dashboard.ngrok.com/signup
2. Create a free account
3. Copy your **authtoken** from https://dashboard.ngrok.com/get-started/your-authtoken

---

## Step 3: Configure Environment Variables

Edit `mcp-server/.env`:

```env
# Ngrok Configuration
NGROK_AUTH_TOKEN=your_auth_token_from_ngrok_dashboard
NGROK_DOMAIN=your-custom-domain.ngrok-free.app  # Optional - for paid plans

# MCP Server Configuration
MCP_SERVER_PORT=3001
MCP_API_KEY=your-secure-api-key-change-this

# Azure AI Foundry Configuration
AZURE_AI_AGENT_ENDPOINT=https://polihack.openai.azure.com/
AZURE_AI_AGENT_API_KEY=your_azure_api_key
AZURE_AI_AGENT_DEPLOYMENT_NAME=polihack
```

---

## Step 4: Start MCP Server with Ngrok

### Using PowerShell Script (Recommended)
```powershell
cd C:\Users\2Usi\Desktop\NoAIUsed\mcp-server
.\start-with-ngrok.ps1
```

This will:
1. ✅ Build the MCP server
2. ✅ Start the HTTP server on port 3001
3. ✅ Start ngrok tunnel
4. ✅ Display the public HTTPS URL

### Manual Method
```powershell
# Terminal 1: Start MCP server
cd C:\Users\2Usi\Desktop\NoAIUsed\mcp-server
npm run start:http

# Terminal 2: Start ngrok
ngrok http 3001
```

---

## Step 5: Get Your Ngrok URL

After starting ngrok, you'll see output like:

```
Session Status                online
Account                       your-account (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL**: `https://abc123.ngrok-free.app`

---

## Step 6: Configure Azure AI Foundry

### Option A: Using Azure AI Foundry Portal

1. Go to https://ai.azure.com
2. Navigate to your project
3. Go to **Settings** → **Connections** or **Tools**
4. Click **"Add Connection"** or **"Add MCP Server"**
5. Enter:
   - **Name**: `task-management-mcp`
   - **Type**: `HTTP/REST API` or `MCP Server`
   - **Endpoint**: `https://abc123.ngrok-free.app` (your ngrok URL)
   - **API Key**: (the value from `MCP_API_KEY` in your .env)
   - **Headers**: 
     ```json
     {
       "Authorization": "Bearer your-mcp-api-key",
       "Content-Type": "application/json"
     }
     ```

6. Test the connection
7. Enable the MCP tools for your agent

### Option B: Using Agent Configuration

When creating or editing your agent, add the MCP server URL:

```json
{
  "name": "Task Management Agent",
  "description": "Processes notifications and manages tasks",
  "model": "gpt-4",
  "tools": [
    {
      "type": "mcp",
      "url": "https://abc123.ngrok-free.app",
      "auth": {
        "type": "bearer",
        "token": "your-mcp-api-key"
      }
    }
  ]
}
```

---

## Step 7: Test the Integration

### Test 1: Call Agent API Directly

```powershell
cd C:\Users\2Usi\Desktop\NoAIUsed\mcp-server
node call-agent-api.js
```

This will:
- Call Azure AI Foundry agent
- Agent will use MCP tools to process notifications
- Display the results

### Test 2: Check MCP Server Logs

Watch your MCP server terminal for incoming requests from Azure AI Foundry.

### Test 3: Process Notifications

```powershell
# From local-sql-bridge
cd C:\Users\2Usi\Desktop\NoAIUsed\local-sql-bridge
node add-test-notification.js 4  # Add test notifications

# Then call agent via API
cd ..\mcp-server
node call-agent-api.js
```

---

## Ngrok Features

### Free Plan
- ✅ Random HTTPS URLs (changes on restart)
- ✅ Up to 40 connections/minute
- ✅ Basic authentication
- ⚠️ URL expires when you stop ngrok

### Paid Plans ($8+/month)
- ✅ Custom domains (e.g., `mcp.yourdomain.com`)
- ✅ Reserved URLs (don't change)
- ✅ Higher rate limits
- ✅ TCP/TLS tunnels

### Web Interface

Ngrok provides a web dashboard at http://127.0.0.1:4040 showing:
- All HTTP requests
- Request/response details
- Timing information
- Useful for debugging

---

## Security Considerations

1. **API Key**: Always use a strong `MCP_API_KEY` in production
2. **HTTPS**: Ngrok automatically provides HTTPS encryption
3. **Authentication**: The MCP server validates the API key on each request
4. **Firewall**: No need to open firewall ports - ngrok handles everything
5. **Rotate Keys**: Change your API key regularly

---

## Troubleshooting

### Issue: "command not found: ngrok"
**Solution**: Install ngrok (see Step 1)

### Issue: "authentication failed"
**Solution**: Set your ngrok authtoken:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Issue: Ngrok URL changes every restart (Free plan)
**Solution**: Either:
- Upgrade to paid plan for reserved domains
- Update Azure AI Foundry URL each time
- Use environment variable to store current URL

### Issue: "ERR_NGROK_108: connection refused"
**Solution**: Make sure MCP server is running first:
```powershell
npm run start:http
```

### Issue: Azure AI Foundry can't connect
**Solution**: 
1. Check ngrok is running: visit http://127.0.0.1:4040
2. Test MCP server locally: `curl http://localhost:3001`
3. Verify API key matches in both .env files
4. Check Azure AI Foundry firewall settings

---

## Alternative: Production Deployment

For production, instead of ngrok, consider:

1. **Azure App Service**: Host MCP server in Azure
2. **Azure Container Instances**: Deploy as container
3. **Azure Functions**: Serverless MCP server
4. **VPN**: Direct connection to your network

But for development and testing, ngrok is perfect! 🚀
