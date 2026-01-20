@echo off
REM Cross-platform Plan Lint Script wrapper for Windows
REM Automatically chooses PowerShell version

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell not found. Please install PowerShell.
    exit /b 1
)

REM Run the PowerShell version with all arguments passed through
powershell -ExecutionPolicy Bypass -File "%~dp0lint-plan.ps1" %*