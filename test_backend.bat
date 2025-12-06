@echo off
echo Testing Memento Backend...
echo.

echo [1/3] Testing health endpoint...
curl -s http://localhost:3000/health
echo.
echo.

echo [2/3] Sending test notification (Meeting)...
curl -s -X POST http://localhost:3000/api/ingest/notification ^
  -H "Content-Type: application/json" ^
  -d "{\"source_app\":\"WhatsApp\",\"title\":\"John Doe\",\"body\":\"Meeting tomorrow at 3pm\",\"timestamp\":\"2025-12-06T10:30:00.000Z\"}"
echo.
echo.

echo [3/3] Fetching tasks...
curl -s http://localhost:3000/api/tasks
echo.
echo.

echo Done!
pause
