@echo off
title Fitness Nation EOS - local dev
setlocal
set "SRC=%~dp0"
set "DEST=%LOCALAPPDATA%\fitness-nation-eos"
set "LOG=%DEST%\dev-log.txt"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org then run this again.
  pause
  exit /b 1
)

echo Copying app to a local folder (avoids OneDrive sync problems)...
robocopy "%SRC%." "%DEST%" /MIR /XD node_modules .next .git /XF start-dev.bat push-to-github.bat dev-log.txt /NFL /NDL /NJH /NJS >nul
cd /d "%DEST%"
echo Fitness Nation EOS launcher > "%LOG%"
node -v >> "%LOG%" 2>&1

if not exist node_modules (
  echo First run - installing dependencies. This takes 1-2 minutes, please wait...
  call npm install --no-audit --no-fund >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo.
    echo npm install FAILED. Details are in %LOG%
    pause
    exit /b 1
  )
)

echo.
echo Starting the app - your browser will open at http://localhost:3000
echo If the page says port 3000 is busy, close other black windows and rerun.
echo Give it 10-20 seconds on first load. Keep this window open.
echo.
start "" "http://localhost:3000"
call npm run dev
pause
