@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title vatech - iniciar

echo.
echo === vatech: a verificar a ultima versao ===

where git >nul 2>nul || (echo [erro] git nao encontrado no PATH. & pause & exit /b 1)
where node >nul 2>nul || (echo [erro] node nao encontrado no PATH. & pause & exit /b 1)

git fetch origin
if errorlevel 1 (
  echo [aviso] sem acesso ao GitHub - a abrir a versao local.
) else (
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set RAMO=%%b
  git diff --quiet && git diff --cached --quiet
  if errorlevel 1 (
    echo [aviso] tens alteracoes locais por guardar - nao vou fazer pull. Faz commit ou stash primeiro.
  ) else (
    git pull --ff-only origin %RAMO%
    if errorlevel 1 echo [aviso] pull nao foi possivel sem conflito - resolve manualmente.
  )
)

echo.
echo === dependencias do web ===
pushd web
if not exist node_modules (call npm ci) else (call npm install --no-audit --no-fund)
popd

echo.
echo === base de dados (MySQL 8.4 em Docker) ===
where docker >nul 2>nul
if errorlevel 1 (
  echo [aviso] docker nao encontrado - a saltar a base de dados.
) else (
  docker info >nul 2>nul
  if errorlevel 1 (
    echo [aviso] Docker Desktop nao esta a correr - a saltar a base de dados.
  ) else (
    docker compose up -d mysql
  )
)

echo.
echo === a abrir o web em http://localhost:3000 ===
start "vatech web" cmd /k "cd /d %~dp0web && npm run dev"
timeout /t 6 >nul
start "" http://localhost:3000

echo.
echo Pronto. Fecha a janela "vatech web" para parar o servidor.
endlocal
