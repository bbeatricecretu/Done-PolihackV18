#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start MCP HTTP Server with Ngrok Tunnel
.DESCRIPTION
    This script starts the MCP server and exposes it via ngrok for Azure AI Foundry
#>

Write-Host "🚀 Starting MCP Server with Ngrok" -ForegroundColor Cyan
Write-Host "=" -NoNewline; Write-Host ("=" * 60)

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$NGROK_AUTH_TOKEN = $env:NGROK_AUTH_TOKEN
$MCP_PORT = if ($env:MCP_SERVER_PORT) { $env:MCP_SERVER_PORT } else { "3001" }
$NGROK_DOMAIN = $env:NGROK_DOMAIN

# Check if ngrok is installed
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host ""
    Write-Host "❌ Ngrok is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install ngrok:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "  2. Or use chocolatey: choco install ngrok" -ForegroundColor White
    Write-Host "  3. Or use scoop: scoop install ngrok" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Configure ngrok auth token if provided
if ($NGROK_AUTH_TOKEN -and $NGROK_AUTH_TOKEN -ne "your_ngrok_auth_token_here") {
    Write-Host "🔑 Configuring ngrok auth token..." -ForegroundColor Yellow
    ngrok config add-authtoken $NGROK_AUTH_TOKEN
}

Write-Host ""
Write-Host "📦 Building MCP Server..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🌐 Starting MCP HTTP Server on port $MCP_PORT..." -ForegroundColor Green

# Start MCP server in background
$mcpJob = Start-Job -ScriptBlock {
    param($port)
    Set-Location $using:PWD
    $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Process")
    node build/http-server.js
} -ArgumentList $MCP_PORT

Start-Sleep -Seconds 2

# Check if MCP server started successfully
if ($mcpJob.State -ne "Running") {
    Write-Host "❌ MCP Server failed to start!" -ForegroundColor Red
    Receive-Job $mcpJob
    exit 1
}

Write-Host "✅ MCP Server running (Job ID: $($mcpJob.Id))" -ForegroundColor Green
Write-Host ""

# Start ngrok tunnel
Write-Host "🔗 Starting Ngrok tunnel..." -ForegroundColor Cyan
if ($NGROK_DOMAIN -and $NGROK_DOMAIN -ne "your-domain.ngrok-free.app") {
    Write-Host "   Using custom domain: $NGROK_DOMAIN" -ForegroundColor White
    $ngrokCmd = "ngrok http $MCP_PORT --domain=$NGROK_DOMAIN"
} else {
    Write-Host "   Using random ngrok URL" -ForegroundColor White
    $ngrokCmd = "ngrok http $MCP_PORT"
}

Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 60)
Write-Host ""
Write-Host "✅ MCP Server is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Local URL:  http://localhost:$MCP_PORT" -ForegroundColor White
Write-Host "🌍 Ngrok URL:  Check ngrok dashboard below" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Available MCP Tools:" -ForegroundColor Cyan
Write-Host "   - get_notifications" -ForegroundColor Gray
Write-Host "   - delete_notification" -ForegroundColor Gray
Write-Host "   - create_task_from_notification" -ForegroundColor Gray
Write-Host "   - create_task_from_chat" -ForegroundColor Gray
Write-Host "   - edit_task" -ForegroundColor Gray
Write-Host "   - delete_task" -ForegroundColor Gray
Write-Host "   - mark_task_complete" -ForegroundColor Gray
Write-Host "   - get_important_tasks" -ForegroundColor Gray
Write-Host "   - get_tasks_by_filter" -ForegroundColor Gray
Write-Host "   - suggest_tasks_by_context" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Copy the ngrok HTTPS URL from the dashboard below" -ForegroundColor White
Write-Host "   2. Go to Azure AI Foundry (https://ai.azure.com)" -ForegroundColor White
Write-Host "   3. Add MCP server with URL: https://your-url.ngrok-free.app" -ForegroundColor White
Write-Host "   4. Set API Key: $env:MCP_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Press Ctrl+C to stop both MCP server and ngrok" -ForegroundColor Yellow
Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 60)
Write-Host ""

# Start ngrok (this will block)
try {
    Invoke-Expression $ngrokCmd
} finally {
    Write-Host ""
    Write-Host "🛑 Stopping MCP Server..." -ForegroundColor Yellow
    Stop-Job $mcpJob
    Remove-Job $mcpJob
    Write-Host "✅ Cleanup complete" -ForegroundColor Green
}
