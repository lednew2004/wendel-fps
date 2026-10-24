@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale o Node.js 22 ou superior e tente novamente.
  echo Site oficial: https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo  TITAN PROTOCOL 4.6.0 - CIDADE REAL AUTOMATICA
 echo  Abra no navegador: http://localhost:3000
 echo  Autorize a localizacao no navegador para explorar a sua cidade.
echo.
node server/server.mjs
pause
