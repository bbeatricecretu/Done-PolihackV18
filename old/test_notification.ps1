# Test Notification Script
$body = @{
    source_app = "WhatsApp"
    title = "John Doe"
    body = "Meeting tomorrow at 3pm"
    timestamp = "2025-12-06T10:30:00.000Z"
} | ConvertTo-Json

Write-Host "Sending test notification to backend..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:3000/api/ingest/notification" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/ingest/notification" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
