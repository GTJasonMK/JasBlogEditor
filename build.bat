@echo off
title JasBlog Editor - Build

echo ========================================
echo    JasBlog Editor Building...
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Install failed
        pause
        exit /b 1
    )
    echo.
)

echo [2/3] Building application...
echo [Info] First build needs to compile Rust, please wait...
echo.

call npm run build:app

if errorlevel 1 (
    echo.
    echo Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Build complete!
echo ========================================
echo.
echo Installer location:
echo   src-tauri\target\release\bundle\nsis\
echo.

explorer "src-tauri\target\release\bundle\nsis"

pause
