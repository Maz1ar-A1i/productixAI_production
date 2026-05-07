@echo off
echo ========================================================
echo       Productix AI - Full Installer Build Script
echo ========================================================
echo.

taskkill /F /IM ProductixAI.exe /T 2>nul

echo [1/4] Building Frontend (React/Vite)...
cd project
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Frontend build failed.
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/4] Checkpointing Database (saving newest accounts)...
python -c "import sqlite3; conn = sqlite3.connect('productix_fastapi/productix.db'); conn.execute('PRAGMA wal_checkpoint(TRUNCATE)'); conn.close()"

echo.
echo [3/4] Running PyInstaller to package the latest code...
call venv\Scripts\activate.bat
pyinstaller productix.spec -y
if %ERRORLEVEL% NEQ 0 (
    echo [!] PyInstaller failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Compiling Inno Setup Installer...
set "ISCC="

:: Check common locations
if exist "C:\Program Files (x86)\Inno Setup 6\iscc.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\iscc.exe"
if exist "C:\Program Files\Inno Setup 6\iscc.exe" set "ISCC=C:\Program Files\Inno Setup 6\iscc.exe"
if exist "%LocalAppData%\Programs\Inno Setup 6\iscc.exe" set "ISCC=%LocalAppData%\Programs\Inno Setup 6\iscc.exe"

if defined ISCC goto :RUN_ISCC

:: If not found, try 'where'
for /f "tokens=*" %%i in ('where iscc 2^>nul') do set "ISCC=%%i"

if defined ISCC goto :RUN_ISCC

echo.
echo [!] Inno Setup Compiler (iscc.exe) not found.
echo     Please open 'setup.iss' in the Inno Setup GUI and compile it manually.
echo.
echo     NOTE: The 'dist' folder HAS been updated with the latest code and DB.
goto :BUILD_DONE

:RUN_ISCC
echo [*] Found Inno Setup Compiler at: "%ISCC%"
"%ISCC%" setup.iss
echo.
echo ========================================================
echo   SUCCESS! Installer created in the 'installer' folder.
echo ========================================================

:BUILD_DONE
pause
