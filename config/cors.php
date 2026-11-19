<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    // Em produção: o endereço do site no Vercel (vários separados por vírgula).
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
