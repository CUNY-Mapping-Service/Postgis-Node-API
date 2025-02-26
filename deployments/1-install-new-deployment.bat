@echo off
cd /D "%~dp0"

setlocal enableextensions

rem Loop through each line in the file
for /f "delims== tokens=1,2" %%G in (.env) do set %%G=%%H

::Create the new folder and cd to it. Copy everything from example too
echo Enter the name of the subfolder for the deployment
echo [eg: US]:
set /p folder=
md %folder%

robocopy example %folder% /E

cd %folder%

echo.
echo Check the service config file (win-service.txt)
echo.
type win-service.txt 
pause

echo.
set /p last_action=Do you want to quit? (q) Test the new configuration? (t):   
call :last-act-%last_action%

	:last-act-q
		echo Done!
		goto :eof

	:last-act-t
        echo Testing in Node...
		cd %~dp0
        cd ..
        %NODE_EXE_PATH% index.js %~dp0%folder% -test
		goto :eof

::	:last-act-i
::		echo CALL %~dp0%folder%/install-nssm-service.bat
::		goto :eof

	:last-act-end

	goto :eof

echo.
echo DONE POINT IIS APPLICATION TO: %~dp0%folder%
pause
