@echo off
echo ==========================================================
echo  Launching Voice Clone Detection System (Frontend + Backend)
echo ==========================================================
echo.

echo [1/2] Launching Backend Server on http://localhost:8000 ...
start "Audio Detection Backend" cmd /k "cd /d %~dp0backend && python main.py"

echo [2/2] Launching Frontend UI on http://localhost:3000 ...
start "Audio Detection Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ==========================================================
echo  Services started in separate terminal windows:
echo  - Frontend Web UI:  http://localhost:3000
echo  - Backend REST API: http://localhost:8000
echo  - Swagger Docs:     http://localhost:8000/docs
echo ==========================================================
