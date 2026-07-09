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

if exist .git rmdir /s /q .git
git init -b main
git config user.name "Brent"
git config user.email "brent@fitnessnation.au"
git add -A
git commit -m "Fitness Nation EOS - full build: branded UI, EOS pages, API sync, migrated data"
git remote add origin %REPO_URL%

echo.
echo Pushing to %REPO_URL%
echo A browser window may open asking you to authorise GitHub - that's normal.
git push -u origin main
if errorlevel 1 (
  echo.
  echo Push FAILED - see the error above.
) else (
  echo.
  echo SUCCESS - code is on GitHub.
)
pause
