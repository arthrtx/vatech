<?php

it('responde 200 em GET /up', function () {
    $this->get('/up')->assertStatus(200);
});

it('devolve 401 em rota protegida sem Accept json', function () {
    $this->get('/api/me')->assertStatus(401);
});
