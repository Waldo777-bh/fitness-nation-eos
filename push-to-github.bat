@echo off
title Push Fitness Nation EOS to GitHub
cd /d "%~dp0"

set REPO_URL=https://github.com/Waldo777-bh/fitness-nation-eos.git

where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found. Install Git for Windows from https://git-scm.com then run this again.
  pause
  exit /b 1
)

if not exist .git (
  git init -b main
  git remote add origin %REPO_URL%
)
git config user.name "Brent"
git config user.email "brent@fitnessnation.au"
git add -A
git commit -m "Update %date% %time%"
echo.
echo Pushing to %REPO_URL%
git push -u origin main
if errorlevel 1 (
  echo.
  echo Push FAILED - see the error above. Tell Claude what it says.
) else (
  echo.
  echo SUCCESS - changes are on GitHub.
)
pause
