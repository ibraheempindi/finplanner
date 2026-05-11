@echo off
title Restart NPM App

echo ====================================
echo Killing process on port 3000...
echo ====================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 >nul

echo.
echo ====================================
echo Running npm install...
echo ====================================

call npm install

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo npm install failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================
echo Starting app...
echo ====================================

call npm start

pause