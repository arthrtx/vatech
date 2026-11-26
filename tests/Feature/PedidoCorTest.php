<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function dia(): string
{
    return now('Europe/Lisbon')->addDays(10)->toDateString();
}

it('guarda a cor valida do pedido', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => dia(), 'data_fim' => dia(), 'cor' => 'pessego'])
        ->assertCreated()
        ->assertJsonPath('data.cor', 'pessego');
});

it('rejeita uma cor fora da lista', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => dia(), 'data_fim' => dia(), 'cor' => 'azul'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('cor');
});

it('sem cor o pedido fica com cor null', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => dia(), 'data_fim' => dia()])
        ->assertCreated()
        ->assertJsonPath('data.cor', null);
});

it('a actualizacao do pedido muda a cor', function () {
    Sanctum::actingAs(User::factory()->create());

    $id = $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => dia(), 'data_fim' => dia(), 'cor' => 'verde'])->json('data.id');

    $this->putJson("/api/pedidos/{$id}", ['tipo' => 'ferias', 'data_inicio' => dia(), 'data_fim' => dia(), 'cor' => 'escuro'])
        ->assertOk()
        ->assertJsonPath('data.cor', 'escuro');
});

it('a agenda devolve a cor aos colegas e ao proprio', function () {
    $empresa = App\Models\Empresa::factory()->create();
    $eu = User::factory()->create(['empresa_id' => $empresa->id]);
    $colega = User::factory()->create(['empresa_id' => $empresa->id]);
    foreach ([$eu, $colega] as $u) {
        App\Models\Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $u->id, 'estado' => 'aprovado', 'data_inicio' => '2026-12-10', 'data_fim' => '2026-12-11', 'cor' => 'violeta']);
    }
    Sanctum::actingAs($eu);

    $r = $this->getJson('/api/agenda?de=2026-12-01&ate=2026-12-31')->assertOk();
    expect(collect($r->json('data'))->pluck('cor')->all())->toBe(['violeta', 'violeta']);
});
