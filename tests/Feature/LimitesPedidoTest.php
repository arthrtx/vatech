<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\User;
use App\Support\LimiteFerias;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// Data fixa: os limites contam dias uteis, por isso os calendarios dos testes tem de ser estaveis.
beforeEach(fn () => Carbon::setTestNow('2026-02-10'));
afterEach(fn () => Carbon::setTestNow());

/** Data fim (Y-m-d) que, a partir de $inicio, completa $uteis dias uteis (sem feriados nacionais) no mesmo ano. */
function fimComUteis(string $inicio, int $uteis): string
{
    $dia = CarbonImmutable::parse($inicio);
    while (LimiteFerias::diasUteis(CarbonImmutable::parse($inicio), $dia, $dia->year) < $uteis) {
        $dia = $dia->addDay();
    }

    return $dia->format('Y-m-d');
}

function pedidoLimite(User $u, string $inicio, string $fim, array $extra = []): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'data_inicio' => $inicio, 'data_fim' => $fim, ...$extra]);
}

it('devolve sempre 3 itens com usados do ano actual, ferias fixas 22/25', function () {
    $ano = 2026;
    $user = User::factory()->create();
    pedidoLimite($user, "$ano-03-02", "$ano-03-06"); // 5 uteis, pendente
    pedidoLimite($user, "$ano-04-01", "$ano-04-02", ['estado' => 'aprovado']); // 2
    pedidoLimite($user, "$ano-05-01", "$ano-05-09", ['estado' => 'recusado']); // nao conta
    Sanctum::actingAs($user);

    $this->getJson('/api/limites')->assertOk()->assertExactJson(['data' => [
        ['tipo' => 'ferias', 'dias_ano' => 22, 'dias_max' => 25, 'transitados' => 0, 'usados' => 7, 'pontes' => 0],
        ['tipo' => 'ausencia', 'dias_ano' => null, 'dias_max' => null, 'transitados' => 0, 'usados' => 0, 'pontes' => 0],
        ['tipo' => 'licenca', 'dias_ano' => null, 'dias_max' => null, 'transitados' => 0, 'usados' => 0, 'pontes' => 0],
    ], 'prazo_ferias' => "$ano-04-30"]);
});

it('PUT /limites ja nao existe', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'ferias', 'dias_ano' => 10]]])->assertStatus(405);
});

it('ignora linhas antigas da tabela limites_pedido', function () {
    $user = User::factory()->create();
    DB::table('limites_pedido')->insert(['empresa_id' => $user->empresa_id, 'tipo' => 'ferias', 'dias_ano' => 5, 'created_at' => now(), 'updated_at' => now()]);
    Sanctum::actingAs($user);

    $this->getJson('/api/limites')->assertJsonPath('data.0.dias_ano', 22)->assertJsonPath('data.0.dias_max', 25);
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-06-01', 'data_fim' => fimComUteis('2026-06-01', 10)])->assertCreated();
});

it('permite ate 25 dias uteis de ferias e recusa o 26.o', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-03-02', 'data_fim' => fimComUteis('2026-03-02', 22)])->assertCreated();
    // 22 + 3 = 25: permitido
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-09-01', 'data_fim' => fimComUteis('2026-09-01', 3)])->assertCreated();
    // 25 + 1 = 26: recusado
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-11-02', 'data_fim' => '2026-11-02'])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2026. Restam 0.');
});

it('pedido unico de 26 dias uteis e recusado', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-03-02', 'data_fim' => fimComUteis('2026-03-02', 26)])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2026. Restam 25.');
});

it('o update nao conta o proprio pedido', function () {
    $user = User::factory()->create();
    $pedido = pedidoLimite($user, '2026-03-02', fimComUteis('2026-03-02', 25)); // 25 uteis
    Sanctum::actingAs($user);

    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2026-03-02', 'data_fim' => fimComUteis('2026-03-02', 24)])->assertOk();
    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => '2026-03-02', 'data_fim' => fimComUteis('2026-03-02', 26)])
        ->assertStatus(422)->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2026. Restam 25.');
});

it('pedidos recusados nao contam', function () {
    $user = User::factory()->create();
    pedidoLimite($user, '2026-03-02', fimComUteis('2026-03-02', 25), ['estado' => 'recusado']);
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-09-01', 'data_fim' => fimComUteis('2026-09-01', 25)])->assertCreated();
});

it('ausencia e licenca nao tem limite', function () {
    $ano = 2026;
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
    $this->getJson('/api/limites')
        ->assertJsonPath('data.1.dias_ano', null)->assertJsonPath('data.1.dias_max', null)
        ->assertJsonPath('data.2.dias_ano', null)->assertJsonPath('data.2.dias_max', null);
});

it('pedido a cavalo de anos conta so os dias de cada ano', function () {
    $ano = 2026;
    $prox = $ano + 1;
    $user = User::factory()->create();
    pedidoLimite($user, "$prox-01-04", fimComUteis("$prox-01-04", 24)); // 24 uteis no ano seguinte
    Sanctum::actingAs($user);

    // 3 uteis em $ano (29-31 Dez) + 3 em $prox (4-6 Jan; dia 1 e feriado) => ano seguinte 24+3 > 25
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-06"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 25 dias úteis de férias em $prox. Restam 1.");

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-04"])->assertCreated();
    // so os dias do ano actual contam no GET: 3
    $this->getJson('/api/limites')->assertJsonPath('data.0.usados', 3);
});

it('fins de semana e feriados nao contam', function () {
    Sanctum::actingAs(User::factory()->create());

    // Qui 30/4 a Ter 5/5: 6 dias de calendario, mas so 3 uteis (1/5 e feriado, 2-3/5 fim de semana).
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-04-30', 'data_fim' => '2026-05-05'])->assertCreated();
    $this->getJson('/api/limites')->assertJsonPath('data.0.usados', 3);
});

it('dias_excedentes conta os dias acima dos 22 do ano, por ordem de data', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $r1 = $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-03-02', 'data_fim' => fimComUteis('2026-03-02', 20)])
        ->assertCreated()->assertJsonPath('data.dias_excedentes', 0);
    // 20 + 5 = 25: 3 dias ficam acima de 22
    $r2 = $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-09-01', 'data_fim' => fimComUteis('2026-09-01', 5)])
        ->assertCreated()->assertJsonPath('data.dias_excedentes', 3);
    $recusado = pedidoLimite($user, '2026-01-05', '2026-01-05', ['estado' => 'recusado']);

    $lista = collect($this->getJson('/api/pedidos')->assertOk()->json('data'))->keyBy('id');
    expect($lista[$r1->json('data.id')]['dias_excedentes'])->toBe(0)
        ->and($lista[$r2->json('data.id')]['dias_excedentes'])->toBe(3)
        ->and($lista[$recusado->id]['dias_excedentes'])->toBe(0);

    $this->getJson('/api/agenda?de=2026-01-01&ate=2026-12-31')->assertOk()
        ->assertJsonFragment(['id' => $r2->json('data.id'), 'dias_excedentes' => 3]);
});

it('dias_excedentes e 0 nos outros tipos', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => '2026-03-02', 'data_fim' => '2026-05-29'])
        ->assertCreated()->assertJsonPath('data.dias_excedentes', 0);
});

describe('cumulo de ferias', function () {
    beforeEach(fn () => Carbon::setTestNow('2028-02-10'));
    afterEach(fn () => Carbon::setTestNow());

    it('acumula as sobras dos anos anteriores e so conta aprovadas', function () {
        $user = User::factory()->create();
        pedidoLimite($user, '2026-03-01', '2026-03-10', ['estado' => 'aprovado']); // 7 uteis -> sobra 15
        pedidoLimite($user, '2026-05-01', '2026-05-05', ['estado' => 'recusado']); // ignora
        pedidoLimite($user, '2027-03-01', '2027-03-05', ['estado' => 'pendente']); // ignora -> sobra 22
        pedidoLimite($user, '2028-03-01', '2028-03-03'); // 3 pendente no ano corrente
        Sanctum::actingAs($user);

        $this->getJson('/api/limites')->assertOk()
            ->assertJsonPath('data.0.transitados', 37)
            ->assertJsonPath('data.0.usados', 3)
            ->assertJsonPath('prazo_ferias', '2028-04-30');
    });

    it('ignora anos anteriores a 2026 e nao deixa sobra negativa', function () {
        $user = User::factory()->create();
        pedidoLimite($user, '2025-03-01', '2025-03-02', ['estado' => 'aprovado']); // ano < 2026: nem conta
        pedidoLimite($user, '2026-03-01', '2026-05-31', ['estado' => 'aprovado']); // > 22 uteis -> sobra 0
        Sanctum::actingAs($user);

        // 2026: 0 (excedeu) + 2027: 22 (nada marcado)
        $this->getJson('/api/limites')->assertJsonPath('data.0.transitados', 22);
    });

    it('os outros tipos nao acumulam', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/limites')
            ->assertJsonPath('data.1.transitados', 0)
            ->assertJsonPath('data.2.transitados', 0);
    });

    it('os transitados nao alargam o maximo de 25', function () {
        Sanctum::actingAs(User::factory()->create()); // 2026 e 2027 inteiros por gozar => 44 transitados

        $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2028-06-01', 'data_fim' => fimComUteis('2028-06-01', 26)])
            ->assertStatus(422)
            ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 25 dias úteis de férias em 2028. Restam 25.');
    });

    it('ferias-resumo e so para admin', function () {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/ferias-resumo')->assertForbidden();
    });

    it('ferias-resumo lista so a empresa, sem apagados, com dias_max e por_marcar', function () {
        $admin = User::factory()->admin()->create();
        $b = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Bruno']);
        $a = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
        User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ze'])->delete();
        User::factory()->create(['empresa_id' => Empresa::factory(), 'nome' => 'Outra']);
        pedidoLimite($a, '2026-03-01', '2026-03-10', ['estado' => 'aprovado']); // sobra 15 + 22 de 2027 = 37
        pedidoLimite($a, '2028-03-01', '2028-03-04'); // 3 uteis usados
        Sanctum::actingAs($admin);

        $this->getJson('/api/ferias-resumo')->assertOk()->assertExactJson(['data' => [
            ['user_id' => $a->id, 'nome' => 'Ana', 'dias_ano' => 22, 'dias_max' => 25, 'transitados' => 37, 'usados' => 3, 'pontes' => 0, 'por_marcar' => 56],
            ['user_id' => $b->id, 'nome' => 'Bruno', 'dias_ano' => 22, 'dias_max' => 25, 'transitados' => 44, 'usados' => 0, 'pontes' => 0, 'por_marcar' => 66],
        ], 'prazo_ferias' => '2028-04-30']);
    });

    it('ferias-resumo nao inclui estagiarios, que nao tiram ferias', function () {
        $admin = User::factory()->admin()->create();
        $f = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
        User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Estagiario', 'papel' => 'estagiario']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/ferias-resumo')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $f->id);
    });
});
