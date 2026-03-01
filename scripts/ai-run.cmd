@echo off
REM Cross-platform AI Run Script wrapper for Windows
REM Automatically chooses PowerShell version

REM Check if PowerShell is available (it should be on modern Windows)
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell not found. Please install PowerShell.
    exit /b 1
)

REM Run the PowerShell version with all arguments passed through
powershell -ExecutionPolicy Bypass -File "%~dp0ai-run.ps1" %*