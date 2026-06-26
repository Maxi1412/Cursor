@echo off
REM Full deploy: build Personal_Calendar_v2.19.0.apk -> local builds + K: Google Drive
cd /d "%~dp0"
echo.
echo ========================================
echo   George v2.19.0 Full Deploy
echo   K: Drive = maxscheurer85@gmail.com
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File scripts\full-deploy.ps1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo DEPLOY FAILED - see errors above
    pause
    exit /b 1
)
echo.
echo DEPLOY SUCCESS - v2.19.0 on local + K: drive
pause
