<?php

use App\Models\Empresa;
use App\Models\LimitePedido;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function definirLimite(User $u, string $tipo, ?int $dias): void
{
    LimitePedido::create(['empresa_id' => $u->empresa_id, 'tipo' => $tipo, 'dias_ano' => $dias]);
}

function pedidoLimite(User $u, string $inicio, string $fim, array $extra = []): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'data_inicio' => $inicio, 'data_fim' => $fim, ...$extra]);
}

it('devolve sempre 3 itens com usados do ano actual', function () {
    $ano = now()->year;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 22);
    pedidoLimite($user, "$ano-03-01", "$ano-03-05"); // 5 pendente
    pedidoLimite($user, "$ano-04-01", "$ano-04-02", ['estado' => 'aprovado']); // 2
    pedidoLimite($user, "$ano-05-01", "$ano-05-09", ['estado' => 'recusado']); // nao conta
    Sanctum::actingAs($user);

    $this->getJson('/api/limites')->assertOk()->assertExactJson(['data' => [
        ['tipo' => 'ferias', 'dias_ano' => 22, 'usados' => 7],
        ['tipo' => 'ausencia', 'dias_ano' => null, 'usados' => 0],
        ['tipo' => 'licenca', 'dias_ano' => null, 'usados' => 0],
    ]]);
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
    $ano = now()->year;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    pedidoLimite($user, "$ano-03-01", "$ano-03-03"); // 3 usados
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-03"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias de ferias em $ano. Restam 2.");

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-02"])
        ->assertCreated();
});

it('o update nao conta o proprio pedido', function () {
    $ano = now()->year;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    $pedido = pedidoLimite($user, "$ano-03-01", "$ano-03-05");
    Sanctum::actingAs($user);

    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => "$ano-03-02", 'data_fim' => "$ano-03-06"])->assertOk();
    $this->putJson("/api/pedidos/{$pedido->id}", ['tipo' => 'ferias', 'data_inicio' => "$ano-03-02", 'data_fim' => "$ano-03-07"])
        ->assertStatus(422)->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias de ferias em $ano. Restam 5.");
});

it('pedidos recusados nao contam', function () {
    $ano = now()->year;
    $user = User::factory()->create();
    definirLimite($user, 'ausencia', 3);
    pedidoLimite($user, "$ano-03-01", "$ano-03-10", ['tipo' => 'ausencia', 'estado' => 'recusado']);
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-03"])->assertCreated();
});

it('sem limite nao restringe', function () {
    $ano = now()->year;
    $user = User::factory()->create();
    definirLimite($user, 'licenca', null);
    Sanctum::actingAs($user);

    $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-01-01", 'data_fim' => "$ano-12-31"])->assertCreated();
});

it('os limites sao isolados por empresa', function () {
    $ano = now()->year;
    $a = User::factory()->create();
    $b = User::factory()->create(['empresa_id' => Empresa::factory()]);
    definirLimite($a, 'ferias', 1);
    Sanctum::actingAs($b);

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-06-01", 'data_fim' => "$ano-06-10"])->assertCreated();
    $this->getJson('/api/limites')->assertJsonPath('data.0.dias_ano', null);
});

it('pedido a cavalo de anos conta so os dias de cada ano', function () {
    $ano = now()->year;
    $prox = $ano + 1;
    $user = User::factory()->create();
    definirLimite($user, 'ferias', 5);
    pedidoLimite($user, "$prox-01-01", "$prox-01-03"); // 3 no ano seguinte
    Sanctum::actingAs($user);

    // 3 dias em $ano (29-31 Dez) + 3 em $prox (1-3 Jan) => ano seguinte 3+3 > 5
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-03"])
        ->assertStatus(422)
        ->assertJsonPath('errors.data_fim.0', "Excede o limite de 5 dias de ferias em $prox. Restam 2.");

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => "$ano-12-29", 'data_fim' => "$prox-01-02"])->assertCreated();
    // so os dias do ano actual contam no GET: 3
    $this->getJson('/api/limites')->assertJsonPath('data.0.usados', 3);
});
