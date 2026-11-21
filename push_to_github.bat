@echo off
cd /d "%~dp0"
title GitHub Push - meta_satsang
echo ========================================================
echo   Pushing code to GitHub:
echo   https://github.com/maumcoaching/meta_satsang.git
echo ========================================================
echo.
echo * If GitHub asks for login, click "Sign in with your browser"
echo.
git push -u origin main
echo.
echo ========================================================
echo   Upload complete! You can close this window now.
echo ========================================================
pause
