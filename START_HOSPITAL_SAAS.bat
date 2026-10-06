@echo off
setlocal enabledelayedexpansion
title CareVista Hospital Management SaaS - Launcher

echo ====================================================================
echo        CAREVISTA HOSPITAL MANAGEMENT SAAS - SYSTEM LAUNCHER
echo ====================================================================
echo.

:: 1. Check & Set Java 21 Environment
echo [1/6] Checking Java Runtime Environment...
if defined JAVA_HOME (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)
where java >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Java\jdk-21\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-21"
        set "PATH=C:\Program Files\Java\jdk-21\bin;%PATH%"
        echo       Java 21 detected at C:\Program Files\Java\jdk-21
    ) else (
        echo [ERROR] Java 21 was not found on your system.
        echo Please verify that Java JDK 21 is installed.
        pause
        exit /b 1
    )
) else (
    echo       Java is available.
)

:: 2. Check & Set Maven Environment
echo [2/6] Checking Maven Build Tool...
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\apache-maven\apache-maven-3.9.16\bin\mvn.cmd" (
        set "MAVEN_HOME=C:\apache-maven\apache-maven-3.9.16"
        set "PATH=C:\apache-maven\apache-maven-3.9.16\bin;%PATH%"
        echo       Maven 3.9.16 detected at C:\apache-maven\apache-maven-3.9.16
    ) else (
        echo [WARNING] Maven not in PATH. Will check if compiled JAR exists.
    )
) else (
    echo       Maven is available.
)

:: 3. Check MySQL Service (MySQL80)
echo [3/6] Checking MySQL Database Service (MySQL80)...
sc query MySQL80 | findstr /i "STATE" | findstr /i "RUNNING" >nul
if %errorlevel% neq 0 (
    echo       MySQL80 service is not currently running. Starting it now...
    net start MySQL80 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [WARNING] Could not start MySQL80 automatically. Please ensure MySQL80 service is enabled in Windows Services.
    ) else (
        echo       MySQL80 service started successfully.
    )
) else (
    echo       MySQL80 service is active and running.
)

:: 4. Check Port & Determine Active Port
echo [4/6] Verifying Web Port Availability (Port 8082)...
set "APP_PORT=8082"

:: Check if CareVista is already responding on 8082
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8082/api/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    echo       CareVista is ALREADY RUNNING on http://localhost:8082/
    echo       Opening browser now...
    start http://localhost:8082/
    pause
    exit /b 0
)

:: Check if port 8082 is in use
netstat -ano | findstr /R /C:":8082 .*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 8082 is currently occupied by another process.
) else (
    echo       Port 8082 is available for CareVista SaaS.
)

:: 5. Ensure JAR is built or compile with Maven
echo [5/6] Preparing CareVista application bundle...
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

set "JAR_PATH=%PROJECT_DIR%target\carevista-hms-1.0.0.jar"
if not exist "%JAR_PATH%" (
    echo       Compiling and packaging CareVista SaaS... This may take a minute on first run...
    call mvn clean package -DskipTests
    if not exist "%JAR_PATH%" (
        echo [ERROR] Build failed. Please check build logs.
        pause
        exit /b 1
    )
)

:: 6. Launch Spring Boot application
echo [6/6] Starting CareVista Hospital Management SaaS on port %APP_PORT%...
start "CareVista HMS Backend Server" java -jar "%JAR_PATH%" --server.port=%APP_PORT%

echo.
echo Waiting for CareVista SaaS to initialize on http://localhost:%APP_PORT%/ ...
echo Please wait a few moments...
echo.

:: Wait loop polling health endpoint
set /a ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%APP_PORT%/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    goto SERVER_READY
)

if %ATTEMPTS% geq 45 (
    echo.
    echo [NOTICE] Application is taking longer than expected. Opening browser...
    start http://localhost:%APP_PORT%/
    goto DONE
)

timeout /t 2 /nobreak >nul
goto WAIT_LOOP

:SERVER_READY
echo ====================================================================
echo  CAREVISTA SAAS IS ONLINE!
echo  Opening browser at: http://localhost:%APP_PORT%/
echo ====================================================================
start http://localhost:%APP_PORT%/

:DONE
echo.
echo ====================================================================
echo  System is running. Keep the 'CareVista HMS Backend Server' window open.
echo  To stop the application at any time, run STOP_HOSPITAL_SAAS.bat.
echo ====================================================================
echo.
exit /b 0
