@echo off
cd /d "%~dp0"
title SANSA Metaverse
echo ==============================================
echo   SANSA Metaverse
echo   Starting server and opening browser...
echo   URL: http://localhost:5173
echo ==============================================
echo.
call npm run dev
pause
