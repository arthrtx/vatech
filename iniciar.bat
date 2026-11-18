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
    docker compose up -d --build mysql api
  )
)

echo.
echo === a iniciar o web (porta 3000) ===
echo API em http://localhost:8000 (a primeira vez demora, a migrar a base de dados).
echo Conta de desenvolvimento: ver README.md
start "vatech web" cmd /k "cd /d %~dp0web && npm run dev"

echo A abrir http://localhost:3000 no browser (o web pode demorar uns segundos a arrancar).
timeout /t 8 /nobreak >nul
start "" http://localhost:3000

echo.
echo Fecha a janela "vatech web" para parar o servidor.
endlocal
