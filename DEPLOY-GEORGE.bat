@echo off
cd /d "%~dp0"
echo George Orchestra Full Deploy
powershell -ExecutionPolicy Bypass -File scripts\full-deploy.ps1
pause
