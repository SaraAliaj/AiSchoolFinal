@echo off
echo Starting AiSchool servers...

:: Set environment variables
set NODE_ENV=development

:: Copy environment variables to Python backend
echo Copying environment variables to Python backend...
copy .env backend\python\.env

:: Start the Python backend
echo Starting Python FastAPI backend...
start cmd /k "cd %~dp0\backend\python && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment
timeout /t 3

:: Start the Node.js server
echo Starting Node.js server...
start cmd /k "cd %~dp0 && node backend/node/server.js"

echo All servers started.
echo The Python FastAPI server is running on http://localhost:8000
echo The Node.js server is running on http://localhost:3000
echo Press Ctrl+C in server windows to stop them. 