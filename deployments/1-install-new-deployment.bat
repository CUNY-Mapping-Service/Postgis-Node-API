@echo off
cd /D "%~dp0"

:: Title as it will show up
set TITLE=

:: Set public host (for tilejson)
set PUBLIC_HOST="dev.urbanresearchmaps.org"

:: empty for local development, match IIS path when deployed
set URL_PATH=

:: server/db [eg. "wa14bv/nj_redistricting"]
set SERVER_DB=

:: [user]/[password] to database
set USER_PASSWORD=

:: Folder where the tile cache will go
set CACHE_FOLDER="tilecache"

:: Whitelisted IP addresses to delete the cache
set CACHE_RM_ALLOWED_IP_default="146.96.128.13,173.54.201.33,146.96.149.152,localhost,0.0.0.0,127.0.0.1"

:: Will likely always be WIN
set OS="WIN"

:: Port to run server on
set PORT=2000

:: Debug log?
set LOG=TRUE

:: Custom js files to include for routes
set CUSTOM_ROUTES=

::Password to authorize pw protected commands
set PASSWORD=

::Extra caching strings
set EXTRA_CACHE_PARAMS=

::Create the new folder and cd to it. Copy everything from example too
echo Enter the name of the subfolder for the deployment
echo [eg: US]:
set /p folder=
md %folder%

robocopy example %folder% /E

cd %folder%

RENAME example_restart-service.bat restart-service.bat

echo OS=%OS% >> .env

echo.
echo Enter the title of the app
echo [eg: US Redistricting]:
set /p title=  
set TITLE=%title%
echo TITLE=%TITLE% >> .env

echo.
echo Enter the PUBLIC host of the app. NOTE: Most apis are set up with local proxy so it will likely be dev.urbanresearchmaps.org or urbanresearchmaps.org
echo [eg: dev.urbanresearchmaps.org]:
set /p public_host=  
set PUBLIC_HOST=%public_host%
echo PUBLIC_HOST=%public_host% >> .env

echo.
echo Enter the path to the API. This is the part after the host name
echo [eg. US-Redistricting-API] (MUST match IIS path!):
set /p URL_PATH=
if not defined URL_PATH (
    echo URL_PATH="" >> .env
) ELSE (
    echo URL_PATH=%URL_PATH% >> .env
)


echo.
echo Enter the postgres server/db
echo [eg. "wa14bv/nj_redistricting"]:
set /p server_db=
set SERVER_DB=%server_db%
echo SERVER_DB=%server_db% >>.env

echo.
echo Enter user/password to postgres database
echo [eg. application:p455w0rd]:
set /p user_password=
set USER_PASSWORD=postgres://%user_password%
echo USER_PASSWORD=%user_password% >> .env

echo.
echo Enter any additional params used for tagging caches. Used only in mvt_layered_schema which should probably be replaced by tilejson anyway.
echo [eg. tag]:
set /p extraParams
set EXTRA_CACHE_PARAMS=%extraParams%
echo EXTRA_CACHE_PARAMS=%extraParams% >> .env

:: echo.
:: echo Enter folder where the tile cache will go
:: echo  [eg. tilecache NO SLASHES!]:  
:: set /p cache_folder=
:: set CACHE_FOLDER=%cache_folder%
echo CACHE_FOLDER=/tilecache >> .env

echo.
echo Enter comma separated whitelisted IP addresses to delete the cache [eg.123.45.67.89,098.65.43.2] 
echo (NOTE: Following are included by default: %CACHE_RM_ALLOWED_IP_default%)
set /p cache_rm_allowed=
set CACHE_RM_ALLOWED_IP=%CACHE_RM_ALLOWED_IP_default%,%cache_rm_allowed%
echo CACHE_RM_ALLOWED_IP=%CACHE_RM_ALLOWED_IP_default%,%cache_rm_allowed% >> .env

echo.
echo Enter port to run server on. 
echo (NOTE: If port is not free, port will be set to next highest free port)
echo [eg. 2000]
set /p port=
set PORT=%port%

echo.
echo Enter password for password protected commands. 
echo [eg. p455w0rd123]
set /p pw=
set PASSWORD=%pw% >> .env

echo.
echo Write out logs from console.log?
echo [eg. TRUE/FALSE]
set /p debug=
set LOG=%debug%

setlocal ENABLEDELAYEDEXPANSION
     set /a Maxport = 65535 - PORT

     for /l %%X in (0,1,!Maxport!) do ( 
     set /a tempo=PORT+X
     echo Current port=!tempo!   
     netstat -o -n -a | findstr :!tempo! 
     if !ERRORLEVEL! equ 0 (@echo "Port available") ELSE (@echo Port : !tempo! is Available!
     goto eof) 
     set /a PORT=PORT+1 )

     echo There is any port available for you sir :(

     :eof
echo.
echo Port set to: %port%
echo PORT=%port% >> .env

echo.
echo Enter comma separated filenames for custom routes (if any)
echo [eg. getDropdowns.js, getOtherThing.js]:
set custom_routes=""
set /p CUSTOM_ROUTES= || set CUSTOM_ROUTES=%custom_routes%
echo CUSTOM_ROUTES=%CUSTOM_ROUTES% >> .env

echo All done setting up the .env file, now setting up Windows service...

echo.
set home="C:\APIs\Postgis-Node-API"
echo Enter the path to the Postgis-Node-API (Press enter to use default: %home%)
set /p HOME= || SET HOME=%home%
echo HOME=%HOME% >> win-service.txt

echo.
echo Set the name of the service as you want it to appear in Windows Service Manager:
set /p SERVICE_NAME=
echo SERVICE_NAME=%SERVICE_NAME% >> win-service.txt

echo.
echo Set the description of the service as you want it to appear in Windows Service Manager:
set /p SERVICE_DESCRIPTION=
echo SERVICE_DESCRIPTION=%SERVICE_DESCRIPTION% >> win-service.txt

echo.
set node_path_exe="C:\Program Files\nodejs\node.exe"
echo Enter the path to Node installation (Press enter to use default: %node_path_exe%)
set /p NODE_EXE_PATH= || SET NODE_EXE_PATH=%node_path_exe%
echo NODE_EXE_PATH=%NODE_EXE_PATH% >> win-service.txt

set PATH_TO_DEPLOYMENT=%~dp0%folder%\\
echo PATH_TO_DEPLOYMENT=%PATH_TO_DEPLOYMENT% >> win-service.txt

echo.
echo Check the env file (.env)
echo.
type .env
pause

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
