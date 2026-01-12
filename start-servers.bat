@echo off
echo Starting SMS2 School Management System...
echo.

REM Start Backend Server
echo [1/2] Starting Backend Server on port 3001...
start "SMS2 Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo [2/2] Starting Frontend Server on port 5173...
start "SMS2 Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo Both servers are starting...
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit this window (servers will keep running)
pause >nul
