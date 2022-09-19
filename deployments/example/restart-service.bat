
cd /D "%~dp0"

setlocal
FOR /F "tokens=*" %%i in ('type win-service.txt') do SET %%i

:: check for permissions first 
:: we need admin priviliges for NSSM
goto check_Permissions

:check_Permissions
    echo Administrative permissions required. Detecting permissions...

    net session >nul 2>&1
    if %errorLevel% == 0 (
        echo Success: Administrative permissions confirmed. Starting config tool
        goto restartService
    ) else (
        echo Failure: Current permissions inadequate. Please right click bat and run as Administrator.
        pause
        exit /B 1
    )
    pause

:restartService
    echo %SERVICE_NAME%
    sc stop %SERVICE_NAME%
    sc start %SERVICE_NAME%
    pause

echo 'done'

pause