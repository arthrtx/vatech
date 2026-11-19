<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\Presenca;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function estagiario(array $attrs = []): User
{
    return User::factory()->create(['papel' => 'estagiario', ...$attrs]);
}

it('estagiario define as datas de estagio e o contrato devolve-as', function () {
    $e = estagiario();
    Sanctum::actingAs($e);

    $this->putJson('/api/me', ['nome' => 'E', 'email' => $e->email, 'estagio_inicio' => '2026-09-01', 'estagio_fim' => '2027-02-28'])
        ->assertOk()
        ->assertJsonPath('user.estagio_inicio', '2026-09-01')
        ->assertJsonPath('user.estagio_fim', '2027-02-28');
});

it('rejeita fim de estagio anterior ao inicio e datas de nao estagiarios', function () {
    Sanctum::actingAs(estagiario());
    $this->putJson('/api/me', ['nome' => 'E', 'email' => 'e@x.test', 'estagio_inicio' => '2026-09-01', 'estagio_fim' => '2026-08-01'])
        ->assertStatus(422)->assertJsonValidationErrors('estagio_fim');

    Sanctum::actingAs(User::factory()->create());
    $this->putJson('/api/me', ['nome' => 'F', 'email' => 'f@x.test', 'estagio_inicio' => '2026-09-01'])
        ->assertStatus(422)->assertJsonValidationErrors('estagio_inicio');
});

it('estagiario pede ausencia e licenca mas nao ferias', function () {
    Sanctum::actingAs(estagiario());
    $base = ['data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'];

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', ...$base])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'licenca', ...$base])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', ...$base])
        ->assertStatus(422)->assertJsonValidationErrors(['tipo' => 'Estagiarios nao podem pedir ferias.']);
});

it('marca entrada e saida com hora do servidor e valida os estados', function () {
    $e = estagiario();
    Sanctum::actingAs($e);

    $this->getJson('/api/presencas/hoje')->assertOk()->assertJsonPath('data', null);
    $this->postJson('/api/presencas/saida')->assertStatus(422);

    $this->postJson('/api/presencas/entrada', ['entrada' => '2000-01-01T00:00:00Z'])
        ->assertCreated()->assertJsonPath('data.user.id', $e->id)->assertJsonPath('data.data', now()->toDateString());
    expect(Presenca::first()->entrada->isToday())->toBeTrue();

    $this->postJson('/api/presencas/entrada')->assertStatus(422);
    $this->postJson('/api/presencas/saida')->assertOk()->assertJsonStructure(['data' => ['id', 'user_id', 'user', 'data', 'entrada', 'saida']]);
    $this->postJson('/api/presencas/saida')->assertStatus(422);
    $this->getJson('/api/presencas/hoje')->assertJsonPath('data.user_id', $e->id);
});

it('admin ve presencas da empresa, estagiario so as suas, funcionario nao ve', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->admin()->create(['empresa_id' => $empresa->id]);
    $e1 = estagiario(['empresa_id' => $empresa->id]);
    $e2 = estagiario(['empresa_id' => $empresa->id]);
    $fora = estagiario();
    foreach ([[$e1, '2026-11-10'], [$e2, '2026-11-10'], [$e1, '2026-11-12'], [$fora, '2026-11-10']] as [$u, $d]) {
        Presenca::create(['user_id' => $u->id, 'data' => $d, 'entrada' => "$d 09:00:00", 'saida' => "$d 17:30:00"]);
    }

    Sanctum::actingAs($admin);
    $this->getJson('/api/presencas')->assertOk()->assertJsonCount(3, 'data');
    $this->getJson("/api/presencas?user_id={$e1->id}&de=2026-11-11")->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.data', '2026-11-12')->assertJsonPath('data.0.saida', '2026-11-12T17:30:00+00:00');

    Sanctum::actingAs($e1);
    $this->getJson('/api/presencas')->assertJsonCount(2, 'data');
    $this->postJson('/api/presencas/entrada')->assertCreated();

    Sanctum::actingAs($admin);
    $this->postJson('/api/presencas/entrada')->assertForbidden();
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/presencas')->assertForbidden();
});

it('recusar exige motivo e o dono recebe motivo_recusa', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->admin()->create(['empresa_id' => $empresa->id]);
    $dono = estagiario(['empresa_id' => $empresa->id]);
    $pedido = Pedido::create(['empresa_id' => $empresa->id, 'user_id' => $dono->id, 'tipo' => 'ausencia', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02', 'estado' => 'pendente']);

    Sanctum::actingAs($admin);
    $this->postJson("/api/pedidos/{$pedido->id}/recusar")->assertStatus(422)->assertJsonValidationErrors('motivo_recusa');
    $this->postJson("/api/pedidos/{$pedido->id}/recusar", ['motivo_recusa' => 'Equipa reduzida'])->assertOk();

    Sanctum::actingAs($dono);
    $this->getJson('/api/pedidos')->assertJsonPath('data.0.estado', 'recusado')->assertJsonPath('data.0.motivo_recusa', 'Equipa reduzida');
});
