@echo off
echo ============================================
echo Starting ngrok tunnel on port 5000...
echo ============================================
echo.
echo IMPORTANT: Copy the ngrok URL and update backend/.env file:
echo   1. Copy the 'Forwarding' URL (https://xxxx.ngrok-free.app)
echo   2. Open backend/.env
echo   3. Uncomment and update: BACKEND_URL=https://xxxx.ngrok-free.app
echo   4. Restart backend server
echo.
echo ============================================
echo.

"%~dp0ngrok\ngrok.exe" http 5000
