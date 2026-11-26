<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sem rede real nos testes: pedidos nao simulados falham e os feriados usam o calculo local.
        Http::preventStrayRequests();
    }
}
