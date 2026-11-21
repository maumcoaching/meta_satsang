@echo off
cd /d "%~dp0"
title GitHub Push - meta_satsang
echo ========================================================
echo   Pushing code to GitHub:
echo   https://github.com/maumcoaching/meta_satsang.git
echo ========================================================
echo.
echo * If a GitHub login window or browser tab appears,
echo   please authorize/sign in to your GitHub account.
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================================
    echo   [ERROR] Push failed.
    echo   Please check the error message above.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [SUCCESS] Code successfully pushed to GitHub!
    echo   Now go back to Vercel and click Deploy!
    echo ========================================================
)
echo.
pause
