@echo off
setlocal enabledelayedexpansion

set "PYTHON311=C:\Program Files\Python311\python.exe"

if not exist "!PYTHON311!" (
    echo [!] ERROR: Python 3.11 not found at !PYTHON311!
    pause
    exit /b 1
)

echo [*] Installing dependencies using Python 3.11...
echo [*] Python: !PYTHON311!
echo.

"!PYTHON311!" -m pip install --upgrade pip --quiet
if !ERRORLEVEL! NEQ 0 echo [!] Warning: pip upgrade failed

echo [*] Installing from requirements.txt...
"!PYTHON311!" -m pip install -r requirements.txt --prefer-binary --disable-pip-version-check
if !ERRORLEVEL! NEQ 0 (
    echo [!] ERROR: pip install failed with code !ERRORLEVEL!
    pause
    exit /b !ERRORLEVEL!
)

echo.
echo [*] Testing imports...
"!PYTHON311!" -c "import groq, reportlab, fastapi, uvicorn; print('[OK] All core modules imported successfully')"
if !ERRORLEVEL! NEQ 0 (
    echo [!] ERROR: Import test failed
    pause
    exit /b !ERRORLEVEL!
)

echo [OK] Dependencies installed successfully!
pause
