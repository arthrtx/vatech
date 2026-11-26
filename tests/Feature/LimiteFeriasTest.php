<?php

use App\Models\Pedido;
use App\Models\User;
use App\Support\LimiteFerias;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// Data fixa: 2027 e futuro (sem transitados) e 2026 o ano corrente.
beforeEach(fn () => Carbon::setTestNow('2026-02-10'));
afterEach(fn () => Carbon::setTestNow());

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

it('aceita 22 dias uteis (o direito anual)', function () {
    Sanctum::actingAs(User::factory()->create());

    // 1 de fevereiro a 2 de marco de 2027: 20 + 2 = 22 dias uteis.
    pedirFerias($this, '2027-02-01', '2027-03-02')->assertCreated();
});

it('recusa mais de 25 dias uteis num so pedido, com erro em data_fim', function () {
    Sanctum::actingAs(User::factory()->create());

    pedirFerias($this, '2027-02-01', '2027-03-05')->assertCreated(); // 25: ainda permitido
    pedirFerias($this, '2027-02-01', '2027-03-08')
        ->assertStatus(422)
        ->assertJsonValidationErrors('data_fim')
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2027. Restam 0.');
    expect(Pedido::count())->toBe(1);
});

it('soma os pedidos do ano (pendentes e aprovados) e ignora recusados, outros tipos e outros anos', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-02-01', '2027-02-19'); // 15 uteis, aprovado
    feriasDe($user, '2027-06-01', '2027-06-04', ['estado' => 'recusado']); // nao conta
    feriasDe($user, '2027-07-01', '2027-07-30', ['tipo' => 'ausencia']); // nao conta
    feriasDe($user, '2026-08-03', '2026-08-28'); // outro ano, nao conta

    pedirFerias($this, '2027-03-01', '2027-03-15')
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2027. Restam 10.');

    pedirFerias($this, '2027-03-01', '2027-03-12')->assertCreated(); // 10 uteis: fecha os 25
    pedirFerias($this, '2027-04-05', '2027-04-05')->assertStatus(422); // ja nao resta nenhum

    // Ausencias nao tem limite.
    pedirFerias($this, '2027-09-01', '2027-09-30', 'ausencia')->assertCreated();
});

it('os pedidos pendentes tambem contam', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-02-01', '2027-02-26', ['estado' => 'pendente']); // 20 uteis

    pedirFerias($this, '2027-04-05', '2027-04-12')->assertStatus(422); // 20 + 6 > 25
    pedirFerias($this, '2027-04-05', '2027-04-09')->assertCreated(); // 20 + 5 = 25
});

it('um pedido que atravessa o ano conta em cada ano separadamente', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    feriasDe($user, '2027-01-04', '2027-01-29'); // 20 uteis em 2027

    // 28/12/2026 a 11/1/2027: 4 uteis em 2026 (28-31) e 6 em 2027 (1/1 e feriado; 4-8 e 11): 20 + 6 > 25.
    pedirFerias($this, '2026-12-28', '2027-01-11')
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2027. Restam 5.');

    // Ate 8/1/2027 sao 5 uteis em 2027 (4-8): 20 + 5 = 25, cabe.
    pedirFerias($this, '2026-12-28', '2027-01-08')->assertCreated();
});

it('ao editar um pedido, ele proprio nao conta em duplicado', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $pedido = feriasDe($user, '2027-02-01', '2027-03-02', ['estado' => 'pendente']); // 22 uteis

    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2027-02-01', 'data_fim' => '2027-03-05'])->assertOk(); // 25
    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2027-02-01', 'data_fim' => '2027-03-08'])
        ->assertStatus(422)->assertJsonValidationErrors('data_fim');
});

it('cada funcionario tem o seu limite', function () {
    $outro = User::factory()->create();
    feriasDe($outro, '2027-02-01', '2027-03-02'); // 22 uteis de outra pessoa

    Sanctum::actingAs(User::factory()->create());
    pedirFerias($this, '2027-02-01', '2027-02-05')->assertCreated();
});
