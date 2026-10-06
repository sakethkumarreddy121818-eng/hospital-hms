@echo off
setlocal enabledelayedexpansion
title CareVista Hospital Management SaaS - Shutdown

echo ====================================================================
echo        CAREVISTA HOSPITAL MANAGEMENT SAAS - SHUTDOWN SCRIPT
echo ====================================================================
echo.

echo [1/3] Searching for active CareVista application process on port 8082...

set "STOPPED_COUNT=0"

:: Check port 8082
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /R /C:":8082 .*LISTENING"') do (
    tasklist /FI "PID eq %%a" | findstr /i "java.exe" >nul
    if !errorlevel! equ 0 (
        echo       Stopping CareVista process on port 8082 (PID: %%a)...
        taskkill /PID %%a /F >nul 2>nul
        set /a STOPPED_COUNT+=1
    )
)

:: Close any window titled "CareVista HMS Backend Server"
taskkill /FI "WINDOWTITLE eq CareVista HMS Backend Server*" /F >nul 2>nul

if %STOPPED_COUNT% gtr 0 (
    echo [2/3] CareVista application stopped successfully.
) else (
    echo [2/3] No active CareVista Java server was found running.
)

echo [3/3] Preserving MySQL Database Service (MySQL80)...
echo       MySQL database was NOT stopped and remains active for data safety.
echo.
echo ====================================================================
echo  CAREVISTA SAAS HAS BEEN SHUT DOWN CLEANLY
echo ====================================================================
echo.
pause
exit /b 0
