@echo off
echo === CHECKING DISK SPACE ===
echo.

echo Temp folder:
dir /s "%TEMP%" 2>nul | findstr "File(s)"

echo.
echo npm cache:
dir /s "%APPDATA%\npm-cache" 2>nul | findstr "File(s)"

echo.
echo Downloads:
dir /s "%USERPROFILE%\Downloads" 2>nul | findstr "File(s)"

echo.
echo Windows Temp:
dir /s "C:\Windows\Temp" 2>nul | findstr "File(s)"

echo.
echo === QUICK CLEANUP COMMANDS ===
echo Run these to free space:
echo   1. Empty Recycle Bin
echo   2. npm cache clean --force
echo   3. Delete temp files
