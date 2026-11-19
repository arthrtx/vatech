<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

const AGENDA = '/api/agenda?de=2026-12-01&ate=2026-12-31';

function pedidoDe(User $user, array $extra = []): Pedido
{
    return Pedido::factory()->create([
        'empresa_id' => $user->empresa_id,
        'user_id' => $user->id,
        'estado' => 'aprovado',
        'subtipo' => 'medica',
        'observacao' => 'segredo',
        ...$extra,
    ]);
}

function equipa(): array
{
    $empresa = Empresa::factory()->create();

    return [
        User::factory()->create(['empresa_id' => $empresa->id]),
        User::factory()->create(['empresa_id' => $empresa->id]),
        User::factory()->admin()->create(['empresa_id' => $empresa->id]),
    ];
}

it('devolve 401 sem token', function () {
    $this->getJson(AGENDA)->assertStatus(401);
});

it('mostra ao colega so aprovados e sem dados sensiveis', function () {
    [$eu, $colega] = equipa();
    $p = pedidoDe($colega, ['tipo' => 'ausencia', 'motivo_recusa' => 'x', 'decidido_por' => $colega->id]);
    Sanctum::actingAs($eu);

    $res = $this->getJson(AGENDA)->assertOk()->assertJsonCount(1, 'data');
    $res->assertJsonPath('data.0.id', $p->id)
        ->assertJsonPath('data.0.user.id', $colega->id)
        ->assertJsonPath('data.0.user.nome', $colega->nome)
        ->assertJsonPath('data.0.tipo', 'ausencia')
        ->assertJsonPath('data.0.data_inicio', '2026-12-01')
        ->assertJsonPath('data.0.data_fim', '2026-12-05')
        ->assertJsonPath('data.0.estado', 'aprovado');
    $item = $res->json('data.0');
    expect(array_keys($item))->toEqualCanonicalizing(['id', 'user', 'tipo', 'data_inicio', 'data_fim', 'estado']);
    foreach (['subtipo', 'observacao', 'motivo_recusa', 'user_id', 'empresa_id', 'decidido_por', 'decidido_em'] as $chave) {
        expect($item)->not->toHaveKey($chave);
    }
    expect(array_keys($item['user']))->toEqualCanonicalizing(['id', 'nome']);
});

it('oculta pendentes e recusados dos colegas', function () {
    [$eu, $colega] = equipa();
    pedidoDe($colega, ['estado' => 'pendente']);
    pedidoDe($colega, ['estado' => 'recusado']);
    Sanctum::actingAs($eu);

    $this->getJson(AGENDA)->assertOk()->assertJsonCount(0, 'data');
});

it('mostra os proprios pedidos completos, pendentes e aprovados, sem recusados', function () {
    [$eu] = equipa();
    $a = pedidoDe($eu);
    $b = pedidoDe($eu, ['estado' => 'pendente', 'data_inicio' => '2026-12-10', 'data_fim' => '2026-12-11']);
    pedidoDe($eu, ['estado' => 'recusado', 'data_inicio' => '2026-12-12', 'data_fim' => '2026-12-13']);
    Sanctum::actingAs($eu);

    $res = $this->getJson(AGENDA)->assertOk()->assertJsonCount(2, 'data');
    $res->assertJsonPath('data.0.id', $a->id)
        ->assertJsonPath('data.0.subtipo', 'medica')
        ->assertJsonPath('data.0.observacao', 'segredo')
        ->assertJsonPath('data.0.user_id', $eu->id)
        ->assertJsonPath('data.0.user.nome', $eu->nome)
        ->assertJsonPath('data.1.id', $b->id)
        ->assertJsonPath('data.1.estado', 'pendente');
});

it('mostra ao admin pendentes e aprovados completos', function () {
    [, $colega, $admin] = equipa();
    pedidoDe($colega);
    pedidoDe($colega, ['estado' => 'pendente', 'data_inicio' => '2026-12-10', 'data_fim' => '2026-12-11']);
    pedidoDe($colega, ['estado' => 'recusado', 'data_inicio' => '2026-12-12', 'data_fim' => '2026-12-13', 'motivo_recusa' => 'm']);
    Sanctum::actingAs($admin);

    $res = $this->getJson(AGENDA)->assertOk()->assertJsonCount(2, 'data');
    $res->assertJsonPath('data.0.subtipo', 'medica')
        ->assertJsonPath('data.0.observacao', 'segredo')
        ->assertJsonPath('data.0.user_id', $colega->id)
        ->assertJsonPath('data.0.user.nome', $colega->nome)
        ->assertJsonPath('data.1.estado', 'pendente');
});

it('oculta pedidos de outra empresa', function () {
    [$eu, , $admin] = equipa();
    $outro = User::factory()->create(['empresa_id' => Empresa::factory()->create()->id]);
    pedidoDe($outro);
    pedidoDe($outro, ['estado' => 'pendente']);

    foreach ([$eu, $admin] as $quem) {
        Sanctum::actingAs($quem);
        $this->getJson(AGENDA)->assertOk()->assertJsonCount(0, 'data');
    }
});

it('oculta pedidos de funcionarios apagados', function () {
    [$eu, $colega, $admin] = equipa();
    pedidoDe($colega);
    $colega->delete();

    foreach ([$eu, $admin] as $quem) {
        Sanctum::actingAs($quem);
        $this->getJson(AGENDA)->assertOk()->assertJsonCount(0, 'data');
    }
});

it('respeita o intervalo com limites inclusivos', function () {
    [$eu, $colega] = equipa();
    $antes = pedidoDe($colega, ['data_inicio' => '2026-11-20', 'data_fim' => '2026-11-30']);
    $tocaDe = pedidoDe($colega, ['data_inicio' => '2026-11-28', 'data_fim' => '2026-12-01']);
    $dentro = pedidoDe($colega, ['data_inicio' => '2026-12-10', 'data_fim' => '2026-12-12']);
    $tocaAte = pedidoDe($colega, ['data_inicio' => '2026-12-31', 'data_fim' => '2027-01-05']);
    $depois = pedidoDe($colega, ['data_inicio' => '2027-01-01', 'data_fim' => '2027-01-05']);
    Sanctum::actingAs($eu);

    $ids = collect($this->getJson(AGENDA)->assertOk()->json('data'))->pluck('id')->all();
    expect($ids)->toBe([$tocaDe->id, $dentro->id, $tocaAte->id])
        ->and($ids)->not->toContain($antes->id)->not->toContain($depois->id);
});

it('valida os parametros com 422', function (string $query, array $campos) {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/agenda'.$query)->assertStatus(422)->assertJsonValidationErrors($campos);
})->with([
    'sem parametros' => ['', ['de', 'ate']],
    'sem ate' => ['?de=2026-12-01', ['ate']],
    'formato invalido' => ['?de=01-12-2026&ate=2026-12-31', ['de']],
    'ate antes de de' => ['?de=2026-12-10&ate=2026-12-09', ['ate']],
]);

it('devolve mensagens de validacao em portugues', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/agenda')->assertStatus(422)
        ->assertJsonPath('errors.de.0', 'A data inicial é obrigatória.');
});
