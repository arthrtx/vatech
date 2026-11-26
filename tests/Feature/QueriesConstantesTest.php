<?php

use App\Models\Pedido;
use App\Models\User;
use App\Services\LimitesPedidoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** Nº de queries de um GET autenticado. */
function queriesQc(object $teste, string $url): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    $teste->getJson($url)->assertOk();
    $n = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $n;
}

function feriasQc(User $u, string $inicio, string $fim, string $estado = 'aprovado'): Pedido
{
    return Pedido::create([
        'empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'tipo' => 'ferias',
        'data_inicio' => $inicio, 'data_fim' => $fim, 'estado' => $estado,
    ]);
}

it('GET /api/rh/fichas faz o mesmo nº de queries com 2 e com 12 pessoas', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    User::factory()->create(['empresa_id' => $admin->empresa_id]);

    $com2 = queriesQc($this, '/api/rh/fichas');
    User::factory()->count(10)->create(['empresa_id' => $admin->empresa_id]);
    $com12 = queriesQc($this, '/api/rh/fichas');

    expect($com12)->toBe($com2);
    $this->getJson('/api/rh/fichas')->assertJsonCount(12, 'data');
});

it('GET /api/pedidos faz o mesmo nº de queries com 2 e com 12 pedidos de ferias', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    feriasQc($func, '2026-03-02', '2026-03-03');
    feriasQc($func, '2026-04-06', '2026-04-07');

    $com2 = queriesQc($this, '/api/pedidos');
    foreach (range(1, 10) as $i) {
        feriasQc(User::factory()->create(['empresa_id' => $admin->empresa_id]), '2026-05-04', '2026-05-05');
    }
    $com12 = queriesQc($this, '/api/pedidos');

    expect($com12)->toBe($com2);
});

it('GET /api/agenda faz o mesmo nº de queries com 2 e com 12 pedidos de ferias', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    feriasQc($func, '2026-03-02', '2026-03-03');
    feriasQc($func, '2026-04-06', '2026-04-07');
    $url = '/api/agenda?de=2026-01-01&ate=2026-12-31';

    $com2 = queriesQc($this, $url);
    foreach (range(1, 10) as $i) {
        feriasQc(User::factory()->create(['empresa_id' => $admin->empresa_id]), '2026-05-04', '2026-05-05');
    }
    $com12 = queriesQc($this, $url);

    expect($com12)->toBe($com2);
});

it('os excedentes em lote batem com o calculo individual', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    // 2026-03-02 a 2026-03-31 = 22 uteis; o 2.o pedido (5 dias) fica todo acima de 22; cancelado nao conta.
    $a = feriasQc($func, '2026-03-02', '2026-03-31');
    $b = feriasQc($func, '2026-09-01', '2026-09-07');
    $c = feriasQc($func, '2026-10-05', '2026-10-09', 'cancelado');

    $lista = collect($this->getJson('/api/pedidos')->assertOk()->json('data'))->keyBy('id');
    $svc = app(LimitesPedidoService::class);

    expect($lista[$a->id]['dias_excedentes'])->toBe($svc->diasExcedentes($a->fresh()))->toBe(0)
        ->and($lista[$b->id]['dias_excedentes'])->toBe($svc->diasExcedentes($b->fresh()))->toBeGreaterThan(0)
        ->and($lista[$c->id]['dias_excedentes'])->toBe(0);
});
