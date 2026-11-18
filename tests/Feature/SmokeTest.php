<?php

it('responde 200 em GET /up', function () {
    $this->get('/up')->assertStatus(200);
});
