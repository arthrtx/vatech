#!/bin/sh
# Arranque da API em produção (Render + TiDB). As definições vêm das variáveis de ambiente do Render.
set -e
# O Render gera um valor aleatório em base64; o Laravel quer o prefixo "base64:".
case "$APP_KEY" in
  base64:*) ;;
  ?*) export APP_KEY="base64:$APP_KEY" ;;
  *) echo "[erro] APP_KEY em falta" >&2; exit 1 ;;
esac
php artisan storage:link --force
php artisan migrate --force
php artisan db:seed --class=ProducaoSeeder --force
php artisan config:cache
export PHP_CLI_SERVER_WORKERS=4
cd public
exec php -S 0.0.0.0:"${PORT:-8000}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
