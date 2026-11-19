FROM php:8.4-cli
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install pdo_mysql zip
COPY opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
