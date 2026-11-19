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
        ->assertStatus(422)->assertJsonValidationErrors(['tipo' => 'Estagiários não podem pedir férias.']);
});

it('marca entrada e saida com hora do servidor e valida os estados', function () {
    $e = estagiario();
    Sanctum::actingAs($e);

    $this->getJson('/api/presencas/hoje')->assertOk()->assertJsonPath('data', null);
    $this->postJson('/api/presencas/saida')->assertStatus(422);

    $this->postJson('/api/presencas/entrada', ['entrada' => '2000-01-01T00:00:00Z'])
        ->assertCreated()->assertJsonPath('data.user.id', $e->id)->assertJsonPath('data.data', now()->toDateString())->assertJsonPath('data.atrasada', false);
    expect(Presenca::first()->entrada->isToday())->toBeTrue();

    $this->postJson('/api/presencas/entrada')->assertStatus(422);
    $this->postJson('/api/presencas/saida')->assertOk()->assertJsonStructure(['data' => ['id', 'user_id', 'user', 'data', 'entrada', 'saida', 'atrasada']]);
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

it('o dia da presenca e o dia em Lisboa, nao o dia UTC', function () {
    $this->travelTo(now()->setDate(2026, 7, 1)->setTime(23, 30)->utc());
    Sanctum::actingAs(estagiario());

    $this->postJson('/api/presencas/entrada')->assertCreated()->assertJsonPath('data.data', '2026-07-02');
    $this->getJson('/api/presencas/hoje')->assertJsonPath('data.data', '2026-07-02');
});

it('regista presenca atrasada com horas de Lisboa gravadas em UTC', function () {
    $this->travelTo(now()->setDate(2026, 7, 10)->setTime(12, 0)->utc());
    $e = estagiario();
    Sanctum::actingAs($e);

    $this->postJson('/api/presencas/atrasada', ['data' => '2026-07-08', 'entrada' => '09:00', 'saida' => '17:30'])
        ->assertCreated()->assertJsonPath('data.data', '2026-07-08')->assertJsonPath('data.user.id', $e->id)
        ->assertJsonPath('data.entrada', '2026-07-08T08:00:00+00:00')->assertJsonPath('data.saida', '2026-07-08T16:30:00+00:00')->assertJsonPath('data.atrasada', true);

    $this->postJson('/api/presencas/atrasada', ['data' => '2026-07-10', 'entrada' => '09:00', 'saida' => '10:00'])->assertCreated();
    $this->getJson('/api/presencas')->assertOk()->assertJsonPath('data.0.atrasada', true);
});

it('presenca atrasada rejeita futura, anterior ao estagio, duplicada e horas invalidas', function () {
    $this->travelTo(now()->setDate(2026, 7, 10)->setTime(12, 0)->utc()); // 13:00 em Lisboa
    $e = estagiario(['estagio_inicio' => '2026-07-01']);
    Sanctum::actingAs($e);
    $post = fn (array $b) => $this->postJson('/api/presencas/atrasada', $b);

    $post(['data' => '2026-07-11', 'entrada' => '09:00', 'saida' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('data');
    $post(['data' => '2026-06-30', 'entrada' => '09:00', 'saida' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('data');
    $post(['data' => '2026-07-08', 'entrada' => '10:00', 'saida' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('saida');
    $post(['data' => '2026-07-08', 'entrada' => '11:00', 'saida' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('saida');
    $post(['data' => '2026-07-10', 'entrada' => '09:00', 'saida' => '14:00'])->assertStatus(422)->assertJsonValidationErrors('saida');

    $post(['data' => '2026-07-08', 'entrada' => '09:00', 'saida' => '10:00'])->assertCreated();
    $post(['data' => '2026-07-08', 'entrada' => '09:00', 'saida' => '10:00'])
        ->assertStatus(422)->assertJsonValidationErrors(['data' => 'Ja existe presenca nesse dia.']);
});

it('presenca atrasada e so para estagiarios', function () {
    $body = ['data' => '2026-07-08', 'entrada' => '09:00', 'saida' => '10:00'];
    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/presencas/atrasada', $body)->assertForbidden();
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->postJson('/api/presencas/atrasada', $body)->assertForbidden();
});
