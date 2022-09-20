@echo off
cd /D "%~dp0"

for /d %%D in (*) do (
    if EXIST %~dp0%%~nxD\restart-service.bat (
        echo.
        echo RESTARTING: %%~nxD
        call %~dp0%%~nxD\restart-service.bat
    )
)

pause