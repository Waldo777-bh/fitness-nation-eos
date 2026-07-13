@echo off
title Remove report PDFs from GitHub
cd /d "%~dp0"
echo Removing member-data PDFs from the repository (files stay on your computer)...
git rm -r --cached inbox >nul 2>nul
git add -A
git commit --amend --no-edit
git push --force origin main
if errorlevel 1 (
  echo Push FAILED - tell Claude what the error says.
) else (
  echo SUCCESS - PDFs removed from GitHub. Local files untouched.
)
pause
