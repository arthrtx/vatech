<?php

use App\Models\Empresa;
use App\Models\LimitePedido;
use App\Models\Pedido;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// Data fixa: os limites contam dias uteis, por isso os calendarios dos testes tem de ser estaveis.
beforeEach(fn () => Carbon::setTestNow('2026-02-10'));
afterEach(fn () => Carbon::setTestNow());

function definirLimite(User $u, string $tipo, ?int $dias): void
{
    LimitePedido::create(['empresa_id' => $u->empresa_id, 'tipo' => $tipo, 'dias_ano' => $dias]);
}

function pedidoLimite(User $u, string $inicio, string $fim, array $extra = []): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'data_inicio' => $inicio, 'data_fim' => $fim, ...$extra]);
}

it('devolve sempre 3 itens com usados do ano actual', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 22);
    pedidoLimite($user, "$ano-03-02", "$ano-03-06"); // 5 uteis, pendente
    pedidoLimite($user, "$ano-04-01", "$ano-04-02", ['estado' => 'aprovado']); // 2
    pedidoLimite($user, "$ano-05-01", "$ano-05-09", ['estado' => 'recusado']); // nao conta
    Sanctum::actingAs($user);

    $this->getJson('/api/limites')->assertOk()->assertExactJson(['data' => [
        ['tipo' => 'ferias', 'dias_ano' => 22, 'transitados' => 0, 'usados' => 7],
        ['tipo' => 'ausencia', 'dias_ano' => null, 'transitados' => 0, 'usados' => 0],
        ['tipo' => 'licenca', 'dias_ano' => null, 'transitados' => 0, 'usados' => 0],
    ], 'prazo_ferias' => "$ano-04-30"]);
});

it('so o admin faz PUT e o funcionario recebe 403', function () {
    $func = User::factory()->create();
    Sanctum::actingAs($func);
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'ferias', 'dias_ano' => 10]]])->assertForbidden();

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'ferias', 'dias_ano' => 10], ['tipo' => 'licenca', 'dias_ano' => null]]])
        ->assertOk()
        ->assertJsonPath('data.0.dias_ano', 10)
        ->assertJsonPath('data.0.usados', 0)
        ->assertJsonCount(3, 'data');
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'ferias', 'dias_ano' => 20]]])->assertOk();
    expect(LimitePedido::where('empresa_id', $admin->empresa_id)->where('tipo', 'ferias')->count())->toBe(1)
        ->and(LimitePedido::where('tipo', 'ferias')->value('dias_ano'))->toBe(20);
});

it('valida o PUT', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'x', 'dias_ano' => 10]]])->assertStatus(422);
    $this->putJson('/api/limites', ['limites' => [['tipo' => 'ferias', 'dias_ano' => 400]]])->assertStatus(422);
});

it('bloqueia o pedido que excede o limite e aceita no limite exacto', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    pedidoLimite($user, "$ano-03-02", "$ano-03-04"); // 3 usados
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-03"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias uteis de ferias em $ano. Restam 2.");

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-02"])
        ->assertCreated();
});

it('o update nao conta o proprio pedido', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    $pedido = pedidoLimite($user, "$ano-03-02", "$ano-03-06"); // 5 uteis
    Sanctum::actingAs($user);

    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => "$ano-03-03", 'data_fim' => "$ano-03-09"])->assertOk();
    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => "$ano-03-03", 'data_fim' => "$ano-03-10"])
        ->assertStatus(422)->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias uteis de ferias em $ano. Restam 5.");
});

it('pedidos recusados nao contam', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'ausencia', 3);
    pedidoLimite($user, "$ano-03-01", "$ano-03-10", ['tipo' => 'ausencia', 'estado' => 'recusado']);
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-03"])->assertCreated();
});

it('sem limite nao restringe', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'licenca', null);
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
});

it('os limites sao isolados por empresa', function () {
    $ano = 2026;
    $a = User::factory()->create();
    $b = User::factory()->create(['empresa_id' => Empresa::factory()]);
    definirLimite($a, 'ferias', 1);
    Sanctum::actingAs($b);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-10"])->assertCreated();
    // Sem linha configurada, as ferias valem 22 dias uteis.
    $this->getJson('/api/limites')->assertJsonPath('data.0.dias_ano', 22);
});

it('pedido a cavalo de anos conta so os dias de cada ano', function () {
    $ano = 2026;
    $prox = $ano + 1;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    pedidoLimite($user, "$prox-01-04", "$prox-01-06"); // 3 uteis no ano seguinte
    Sanctum::actingAs($user);

    // 3 uteis em $ano (29-31 Dez) + 3 em $prox (4-6 Jan; dia 1 e feriado) => ano seguinte 3+3 > 5
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-06"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias uteis de ferias em $prox. Restam 2.");

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-05"])->assertCreated();
    // so os dias do ano actual contam no GET: 3
    $this->getJson('/api/limites')->assertJsonPath('data.0.usados', 3);
});

it('fins de semana e feriados nao contam para o limite', function () {
    $ano = 2026;
    $user = User::factory()->create();
    definirLimite($user, 'ausencia', 3);
    Sanctum::actingAs($user);

    // Qui 30/4 a Ter 5/5: 6 dias de calendario, mas so 3 uteis (1/5 e feriado, 2-3/5 fim de semana).
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-04-30", 'data_fim' => "$ano-05-05"])->assertCreated();
    $this->getJson('/api/limites')->assertJsonPath('data.1.usados', 3);

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-05-06", 'data_fim' => "$ano-05-06"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 3 dias uteis de ausencia em $ano. Restam 0.");
});

describe('cumulo de ferias', function () {
    beforeEach(fn () => Carbon::setTestNow('2028-02-10'));
    afterEach(fn () => Carbon::setTestNow());

    it('acumula as sobras dos anos anteriores e so conta aprovadas', function () {
        $user = User::factory()->create();
        definirLimite($user, 'ferias', 22);
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
        definirLimite($user, 'ferias', 5);
        pedidoLimite($user, '2025-03-01', '2025-03-02', ['estado' => 'aprovado']); // ano < 2026: nem conta
        pedidoLimite($user, '2026-03-01', '2026-03-10', ['estado' => 'aprovado']); // 7 uteis > 5 -> sobra 0
        Sanctum::actingAs($user);

        // 2026: 0 (excedeu) + 2027: 5 (nada marcado)
        $this->getJson('/api/limites')->assertJsonPath('data.0.transitados', 5);
    });

    it('sem limite nao ha transitados', function () {
        $user = User::factory()->create();
        definirLimite($user, 'ferias', null);
        Sanctum::actingAs($user);

        $this->getJson('/api/limites')->assertJsonPath('data.0.transitados', 0);
    });

    it('os outros tipos nao acumulam', function () {
        $user = User::factory()->create();
        definirLimite($user, 'ausencia', 5);
        Sanctum::actingAs($user);

        $this->getJson('/api/limites')
            ->assertJsonPath('data.1.transitados', 0)
            ->assertJsonPath('data.2.transitados', 0);
        $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => '2028-06-01', 'data_fim' => '2028-06-08'])
            ->assertStatus(422)
            ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 5 dias uteis de ausencia em 2028. Restam 5.');
    });

    it('o limite efectivo permite exceder dias_ano ate dias_ano + transitados', function () {
        $user = User::factory()->create();
        definirLimite($user, 'ferias', 5);
        Sanctum::actingAs($user); // 2026 e 2027 inteiros por gozar => 10 transitados, efectivo 15

        $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2028-06-01', 'data_fim' => '2028-06-22'])
            ->assertCreated();
        $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2028-07-03', 'data_fim' => '2028-07-03'])
            ->assertStatus(422)
            ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 15 dias uteis de ferias em 2028. Restam 0.');
    });

    it('anos futuros usam o limite sem transitados', function () {
        $user = User::factory()->create();
        definirLimite($user, 'ferias', 5);
        Sanctum::actingAs($user);

        $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2029-06-01', 'data_fim' => '2029-06-08'])
            ->assertStatus(422)
            ->assertJsonPath('errors.data_fim.0', 'Excede o limite de 5 dias uteis de ferias em 2029. Restam 5.');
    });

    it('ferias-resumo e so para admin', function () {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/ferias-resumo')->assertForbidden();
    });

    it('ferias-resumo lista so a empresa, sem apagados, com por_marcar', function () {
        $admin = User::factory()->admin()->create();
        definirLimite($admin, 'ferias', 22);
        $b = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Bruno']);
        $a = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
        User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ze'])->delete();
        User::factory()->create(['empresa_id' => Empresa::factory(), 'nome' => 'Outra']);
        pedidoLimite($a, '2026-03-01', '2026-03-10', ['estado' => 'aprovado']); // sobra 15 + 22 de 2027 = 37
        pedidoLimite($a, '2028-03-01', '2028-03-04'); // 3 uteis usados
        Sanctum::actingAs($admin);

        $this->getJson('/api/ferias-resumo')->assertOk()->assertExactJson(['data' => [
            ['user_id' => $a->id, 'nome' => 'Ana', 'dias_ano' => 22, 'transitados' => 37, 'usados' => 3, 'por_marcar' => 56],
            ['user_id' => $b->id, 'nome' => 'Bruno', 'dias_ano' => 22, 'transitados' => 44, 'usados' => 0, 'por_marcar' => 66],
        ], 'prazo_ferias' => '2028-04-30']);
    });

    it('ferias-resumo sem limite devolve por_marcar 0', function () {
        $admin = User::factory()->admin()->create();
        definirLimite($admin, 'ferias', null);
        $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/ferias-resumo')->assertOk()
            ->assertJsonPath('data.0.user_id', $u->id)
            ->assertJsonPath('data.0.dias_ano', null)
            ->assertJsonPath('data.0.por_marcar', 0);
    });
});
