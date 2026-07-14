@echo off
title Push Fitness Nation EOS fix
cd /d "%~dp0"
echo Clearing any stale git locks...
del /f /q ".git\index.lock" ".git\HEAD.lock" ".git\refs\heads\main.lock" >nul 2>&1
echo.
echo Pushing to GitHub (Railway will auto-deploy)...
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo Push FAILED - see the error above. Tell Claude what it says.
) else (
  echo.
  echo SUCCESS - changes are on GitHub. Railway redeploys in ~2-3 minutes.
)
echo.
pause
