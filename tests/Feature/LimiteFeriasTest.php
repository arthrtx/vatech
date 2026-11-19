<?php

use App\Models\Pedido;
use App\Models\User;
use App\Support\LimiteFerias;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function pedirFerias($teste, string $inicio, string $fim, string $tipo = 'ferias')
{
    return $teste->postJson('/api/pedidos', ['tipo' => $tipo, 'data_inicio' => $inicio, 'data_fim' => $fim]);
}

function feriasDe(User $user, string $inicio, string $fim, array $extra = []): Pedido
{
    return Pedido::factory()->create([
        'empresa_id' => $user->empresa_id, 'user_id' => $user->id, 'tipo' => 'ferias',
        'estado' => 'aprovado', 'subtipo' => null, 'data_inicio' => $inicio, 'data_fim' => $fim, ...$extra,
    ]);
}

it('conta so dias uteis: sem fins de semana nem feriados nacionais', function () {
    // 21 a 31 de dezembro de 2026: 21-24 (4) + 28-31 (4); o dia 25 e feriado e 26-27 e fim de semana.
    expect(LimiteFerias::diasUteis(CarbonImmutable::parse('2026-12-21'), CarbonImmutable::parse('2026-12-31'), 2026))->toBe(8);
    // Pascoa de 2027 e a 28 de marco: Sexta-feira Santa (26) nao conta.
    expect(LimiteFerias::diasUteis(CarbonImmutable::parse('2027-03-22'), CarbonImmutable::parse('2027-03-26'), 2027))->toBe(4);
    expect(LimiteFerias::feriadosNacionais(2027))->toContain('2027-03-26', '2027-03-28', '2027-05-27');
});

it('aceita exatamente 22 dias uteis e recusa 23', function () {
    Sanctum::actingAs(User::factory()->create());

    // 1 de fevereiro a 2 de marco de 2027: 20 + 2 = 22 dias uteis.
    pedirFerias($this, '2027-02-01', '2027-03-02')->assertCreated();
});

it('recusa mais de 22 dias uteis num so pedido, com erro em data_fim', function () {
    Sanctum::actingAs(User::factory()->create());

    pedirFerias($this, '2027-02-01', '2027-03-03')
        ->assertStatus(422)
        ->assertJsonValidationErrors('data_fim')
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 22 dias úteis de férias por ano: em 2027 já tem 0 marcados e este pedido tem 23 (restam 22).');
    expect(Pedido::count())->toBe(0);
});

it('soma os pedidos do ano (pendentes e aprovados) e ignora recusados, outros tipos e outros anos', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-02-01', '2027-02-19'); // 15 uteis, aprovado
    feriasDe($user, '2027-06-01', '2027-06-04', ['estado' => 'recusado']); // nao conta
    feriasDe($user, '2027-07-01', '2027-07-30', ['tipo' => 'ausencia']); // nao conta
    feriasDe($user, '2026-08-03', '2026-08-28'); // outro ano, nao conta

    pedirFerias($this, '2027-03-01', '2027-03-10')
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 22 dias úteis de férias por ano: em 2027 já tem 15 marcados e este pedido tem 8 (restam 7).');

    pedirFerias($this, '2027-03-01', '2027-03-09')->assertCreated(); // 7 uteis: fecha os 22
    pedirFerias($this, '2027-04-05', '2027-04-05')->assertStatus(422); // ja nao resta nenhum

    // Ausencias nao tem limite.
    pedirFerias($this, '2027-09-01', '2027-09-30', 'ausencia')->assertCreated();
});

it('os pedidos pendentes tambem contam', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-02-01', '2027-02-26', ['estado' => 'pendente']); // 20 uteis

    pedirFerias($this, '2027-04-05', '2027-04-07')->assertStatus(422); // 20 + 3 > 22
    pedirFerias($this, '2027-04-05', '2027-04-06')->assertCreated(); // 20 + 2 = 22
});

it('um pedido que atravessa o ano conta em cada ano separadamente', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-01-04', '2027-01-29'); // 20 uteis em 2027

    // 28/12/2026 a 8/1/2027: 4 uteis em 2026 (28-31) e 5 em 2027 (1/1 e feriado; 4-8): 20 + 5 > 22.
    pedirFerias($this, '2026-12-28', '2027-01-08')
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 22 dias úteis de férias por ano: em 2027 já tem 20 marcados e este pedido tem 5 (restam 2).');

    // Ate 6/1/2027 sao 3 uteis em 2027 (4-6): 20 + 3 = 23 > 22; ate 5/1 sao 2: cabe.
    pedirFerias($this, '2026-12-28', '2027-01-05')->assertCreated();
});

it('ao editar um pedido, ele proprio nao conta em duplicado', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $pedido = feriasDe($user, '2027-02-01', '2027-03-02', ['estado' => 'pendente']); // 22 uteis

    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2027-02-01', 'data_fim' => '2027-03-02'])->assertOk();
    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2027-02-01', 'data_fim' => '2027-03-03'])
        ->assertStatus(422)->assertJsonValidationErrors('data_fim');
});

it('cada funcionario tem o seu limite', function () {
    $outro = User::factory()->create();
    feriasDe($outro, '2027-02-01', '2027-03-02'); // 22 uteis de outra pessoa

    Sanctum::actingAs(User::factory()->create());
    pedirFerias($this, '2027-02-01', '2027-02-05')->assertCreated();
});
