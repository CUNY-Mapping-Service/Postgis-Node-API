@echo off
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
        goto startInstallation
    ) else (
        echo Failure: Current permissions inadequate. Please right click bat and run as Administrator.
        pause
        exit /B 1
    )
    pause

:: only gets called when we have admin priviliges
:startInstallation
  echo Installing service
  
  :: replace with the absolute path where node.exe can be found 
  nssm install %SERVICE_NAME% %NODE_EXE_PATH%
  nssm set %SERVICE_NAME% Description "%SERVICE_DESCRIPTION%"
  nssm set %SERVICE_NAME% AppDirectory "%HOME%"
  
  :: replace index.js with the name of your script
  nssm set %SERVICE_NAME% AppParameters "index.js" %PATH_TO_DEPLOYMENT%
  
  :: optionally set the out.log and error.log paths which will be used for stdouts and sterr messages
  :: better use a logging framework like winston
  nssm set %SERVICE_NAME% AppStdout "%HOME%\out.log" 
  nssm set %SERVICE_NAME% AppStderr "%HOME%\error.log"
  
  :: Start the service
  nssm start %SERVICE_NAME%
  echo Successfully installed and started service %SERVICE_NAME%
endlocal
  pause