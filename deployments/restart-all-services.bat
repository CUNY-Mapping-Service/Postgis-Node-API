@echo off
cd /D "%~dp0"

for /d %%D in (*) do (
    echo.
    echo RESTARTING: %%~nxD
    call %~dp0%%~nxD\restart-service.bat
)

pause