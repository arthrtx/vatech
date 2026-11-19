#!/bin/sh
# Arranque da API em qualquer maquina: prepara .env, dependencias, chave, base de dados e servidor.
set -e
[ -f .env ] || cp .env.example .env
[ -d vendor ] || composer install --no-interaction --prefer-dist
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --force
# php -S herda o ambiente do container (DB_HOST=mysql); `artisan serve` descartaria essas variaveis.
# Varios processos: um pedido lento ja nao bloqueia os outros.
export PHP_CLI_SERVER_WORKERS=4
cd public
exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
