@echo off
title JasBlog Editor

echo ========================================
echo    JasBlog Editor Starting...
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Install failed
        pause
        exit /b 1
    )
    echo.
)

echo [Info] First run needs to compile Rust, please wait...
echo [Info] App window will open after compilation
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

call npm run dev:app

pause
