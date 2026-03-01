@echo off
echo Creating D:\dev directory...
mkdir D:\dev 2>nul
echo.
echo Copying gpnet3 to D:\dev\gpnet3...
echo This may take a few minutes...
xcopy "C:\dev\gpnet3" "D:\dev\gpnet3\" /E /I /H /Y
echo.
echo Copy complete!
echo.
echo DONE! gpnet3 copied to D:\dev\gpnet3
echo.
echo After verifying the copy, you can delete C:\dev\gpnet3 manually
echo Press any key to close...
pause
