<?php

use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('licenca fica aprovada logo e aparece ao admin ate ele marcar visto', function () {
    $f = User::factory()->create();
    Sanctum::actingAs($f);
    $inicio = now('Europe/Lisbon')->addDays(10)->toDateString();
    $id = $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => $inicio, 'data_fim' => $inicio])
        ->assertCreated()
        ->assertJsonPath('data.estado', 'aprovado')
        ->json('data.id');

    $admin = User::factory()->admin()->create(['empresa_id' => $f->empresa_id]);
    Sanctum::actingAs($admin);
    $this->getJson('/api/pedidos?licencas_por_ver=1')->assertOk()->assertJsonCount(1, 'data');
    $this->postJson("/api/pedidos/{$id}/aprovar")->assertStatus(409);

    $this->postJson("/api/pedidos/{$id}/visto")->assertOk();
    $this->getJson('/api/pedidos?licencas_por_ver=1')->assertOk()->assertJsonCount(0, 'data');
});

it('o funcionario cancela uma licenca que ainda nao comecou, mas nao uma que ja passou', function () {
    $f = User::factory()->create();
    Sanctum::actingAs($f);
    $futura = Pedido::factory()->create(['user_id' => $f->id, 'empresa_id' => $f->empresa_id, 'tipo' => 'licenca', 'estado' => 'aprovado',
        'data_inicio' => now()->addDays(5)->toDateString(), 'data_fim' => now()->addDays(6)->toDateString()]);
    $passada = Pedido::factory()->create(['user_id' => $f->id, 'empresa_id' => $f->empresa_id, 'tipo' => 'licenca', 'estado' => 'aprovado',
        'data_inicio' => now()->subDays(6)->toDateString(), 'data_fim' => now()->subDays(5)->toDateString()]);

    $this->deleteJson("/api/pedidos/{$futura->id}")->assertNoContent();
    $this->deleteJson("/api/pedidos/{$passada->id}")->assertStatus(409);
    $this->putJson("/api/pedidos/{$passada->id}", ['tipo' => 'licenca', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-01'])->assertStatus(409);
});

it('so o admin marca licencas como vistas', function () {
    $f = User::factory()->create();
    $p = Pedido::factory()->create(['user_id' => $f->id, 'empresa_id' => $f->empresa_id, 'tipo' => 'licenca', 'estado' => 'aprovado']);
    Sanctum::actingAs($f);
    $this->postJson("/api/pedidos/{$p->id}/visto")->assertForbidden();
});
