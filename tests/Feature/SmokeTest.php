<?php

it('responde 200 em GET /', function () {
    $this->get('/')->assertStatus(200);
});
