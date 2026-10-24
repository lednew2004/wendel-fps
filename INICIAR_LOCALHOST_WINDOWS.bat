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
echo  TITAN PROTOCOL 3.9.1 - CINEMATIC LAB
 echo  Abra no navegador: http://localhost:3000
 echo  Compare ORIGINAL e NOVO com F8 ou com o botao na tela.
echo.
node server/server.mjs
pause
