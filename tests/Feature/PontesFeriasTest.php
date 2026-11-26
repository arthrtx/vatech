<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\Ponte;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// 2027: sem transitados de anos anteriores a baralhar as contas.
beforeEach(fn () => Carbon::setTestNow('2027-02-10'));
afterEach(fn () => Carbon::setTestNow());

function ponteDe(int $empresaId, string $inicio, string $fim): Ponte
{
    return Ponte::create(['empresa_id' => $empresaId, 'nome' => 'Ponte', 'data_inicio' => $inicio, 'data_fim' => $fim]);
}

function feriasPonte(User $u, string $inicio, string $fim, string $estado = 'aprovado'): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'tipo' => 'ferias', 'subtipo' => null, 'estado' => $estado, 'data_inicio' => $inicio, 'data_fim' => $fim]);
}

/** @return array{usados:int, pontes:int} do item `ferias` de GET /limites, autenticado como $u. */
function saldoFerias($teste, User $u): array
{
    Sanctum::actingAs($u);
    $ferias = collect($teste->getJson('/api/limites')->assertOk()->json('data'))->firstWhere('tipo', 'ferias');

    return ['usados' => $ferias['usados'], 'pontes' => $ferias['pontes']];
}

it('a ponte desconta os seus dias uteis ao saldo de ferias de todos os funcionarios da empresa', function () {
    $ana = User::factory()->create();
    $bruno = User::factory()->create(['empresa_id' => $ana->empresa_id]);
    ponteDe($ana->empresa_id, '2027-03-01', '2027-03-05'); // seg-sex: 5 uteis

    expect(saldoFerias($this, $ana))->toBe(['usados' => 5, 'pontes' => 5])
        ->and(saldoFerias($this, $bruno))->toBe(['usados' => 5, 'pontes' => 5]);
});

it('fins de semana e feriados nacionais dentro da ponte nao contam', function () {
    $u = User::factory()->create();
    ponteDe($u->empresa_id, '2027-03-05', '2027-03-08'); // sex, sab, dom, seg: 2 uteis
    ponteDe($u->empresa_id, '2027-03-25', '2027-03-26'); // qui + Sexta-feira Santa: 1 util

    expect(saldoFerias($this, $u))->toBe(['usados' => 3, 'pontes' => 3]);
});

it('ponte a cavalo de anos reparte-se por ano', function () {
    $u = User::factory()->create();
    // 2026: 28-31 Dez (4 uteis); 2027: 1 Jan feriado, 2-3 fim de semana, 4-5 (2 uteis).
    ponteDe($u->empresa_id, '2026-12-28', '2027-01-05');

    expect(saldoFerias($this, $u))->toBe(['usados' => 2, 'pontes' => 2]);

    Carbon::setTestNow('2026-12-01');
    expect(saldoFerias($this, $u))->toBe(['usados' => 4, 'pontes' => 4]);
});

it('ferias que ja cobrem dias da ponte contam uma so vez', function () {
    $u = User::factory()->create();
    $outro = User::factory()->create(['empresa_id' => $u->empresa_id]);
    ponteDe($u->empresa_id, '2027-03-01', '2027-03-05'); // 5 uteis
    feriasPonte($u, '2027-03-02', '2027-03-03'); // 2 dentro da ponte
    feriasPonte($u, '2027-03-08', '2027-03-09', 'pendente'); // 2 fora da ponte

    // 2 + 2 das ferias, mais os 3 dias da ponte que nenhum pedido cobre.
    expect(saldoFerias($this, $u))->toBe(['usados' => 7, 'pontes' => 3])
        ->and(saldoFerias($this, $outro))->toBe(['usados' => 5, 'pontes' => 5]);
});

it('pedir ferias numa ponte nao gasta mais dias', function () {
    $u = User::factory()->create();
    ponteDe($u->empresa_id, '2027-03-01', '2027-03-05');
    Sanctum::actingAs($u);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2027-03-04', 'data_fim' => '2027-03-05'])->assertCreated();

    expect(saldoFerias($this, $u))->toBe(['usados' => 5, 'pontes' => 3]);
});

it('o limite de 25 dias conta as pontes mas nao dobra os dias que o pedido tem na ponte', function () {
    $u = User::factory()->create();
    ponteDe($u->empresa_id, '2027-03-01', '2027-03-05'); // 5 uteis
    feriasPonte($u, '2027-04-05', '2027-04-23'); // 15 uteis (nenhum feriado): 20 no total
    Sanctum::actingAs($u);

    // 3 dias novos fora da ponte: 20 + 3 = 23, cabe; 6: 26, nao cabe.
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2027-06-01', 'data_fim' => '2027-06-03'])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2027-07-05', 'data_fim' => '2027-07-10'])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2027. Restam 2.');
    // Sobre a ponte (5 dias, ja contados): nao pesa nada.
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-05'])->assertCreated();
});

it('ponte de outra empresa nao conta, nem para admin ou estagiario', function () {
    $u = User::factory()->create();
    $admin = User::factory()->admin()->create(['empresa_id' => $u->empresa_id]);
    $estagiario = User::factory()->create(['empresa_id' => $u->empresa_id, 'papel' => 'estagiario']);
    ponteDe(Empresa::factory()->create()->id, '2027-03-01', '2027-03-05');
    expect(saldoFerias($this, $u))->toBe(['usados' => 0, 'pontes' => 0]);

    ponteDe($u->empresa_id, '2027-03-01', '2027-03-05');
    expect(saldoFerias($this, $admin))->toBe(['usados' => 0, 'pontes' => 0])
        ->and(saldoFerias($this, $estagiario))->toBe(['usados' => 0, 'pontes' => 0]);
});

it('criar e apagar uma ponte actualiza o saldo e o ferias-resumo do admin', function () {
    $admin = User::factory()->admin()->create();
    $u = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
    Sanctum::actingAs($admin);

    $id = $this->postJson('/api/pontes', ['nome' => 'Ponte', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-02'])->assertCreated()->json('data.id');
    $linha = $this->getJson('/api/ferias-resumo')->assertOk()->json('data.0');
    expect($linha['usados'])->toBe(2)->and($linha['pontes'])->toBe(2)->and($linha['por_marcar'])->toBe(20 + $linha['transitados'])->and(saldoFerias($this, $u))->toBe(['usados' => 2, 'pontes' => 2]);

    Sanctum::actingAs($admin);
    $this->deleteJson("/api/pontes/$id")->assertNoContent();
    expect(saldoFerias($this, $u))->toBe(['usados' => 0, 'pontes' => 0]);
});
