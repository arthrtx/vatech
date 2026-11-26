<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function novoPedido(array $extra = []): array
{
    return ['tipo' => 'ferias', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-05', ...$extra];
}

it('faz login com credenciais validas', function () {
    $user = User::factory()->admin()->create(['email' => 'a@x.test']);

    $this->postJson('/api/login', ['email' => 'a@x.test', 'password' => 'password'])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'nome', 'email', 'papel', 'empresa_id']])
        ->assertJsonPath('user.id', $user->id);
});

it('falha o login com password errada', function () {
    User::factory()->create(['email' => 'a@x.test']);

    $this->postJson('/api/login', ['email' => 'a@x.test', 'password' => 'errada'])
        ->assertStatus(422)
        ->assertJsonStructure(['message', 'errors']);
});

it('devolve 401 sem token', function () {
    $this->getJson('/api/me')->assertStatus(401);
    $this->getJson('/api/pedidos')->assertStatus(401);
});

it('devolve 403 ao funcionario nas rotas de admin', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/funcionarios')->assertStatus(403);
    $this->postJson('/api/pedidos/1/aprovar')->assertStatus(403);
});

it('o pedido que o admin cria para si fica aprovado logo', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/pedidos', novoPedido())->assertCreated()->assertJsonPath('data.estado', 'aprovado');
});

it('faz logout e devolve /me', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)->getJson('/api/me')->assertOk()->assertJsonPath('user.id', $user->id);
    $this->withToken($token)->postJson('/api/logout')->assertStatus(204);
    expect($user->tokens()->count())->toBe(0);
});

it('admin lista os funcionarios da sua empresa', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->create(['empresa_id' => $admin->empresa_id]);
    User::factory()->create(); // outra empresa
    Sanctum::actingAs($admin);

    $this->getJson('/api/funcionarios')->assertOk()->assertJsonCount(2, 'data');
});

it('funcionario cria pedido pendente e ve so os seus', function () {
    $func = User::factory()->create();
    Pedido::factory()->create(['empresa_id' => $func->empresa_id]); // de outro utilizador
    Sanctum::actingAs($func);

    $this->postJson('/api/pedidos', novoPedido())
        ->assertStatus(201)
        ->assertJsonPath('data.estado', 'pendente')
        ->assertJsonPath('data.user_id', $func->id)
        ->assertJsonMissingPath('avisos');

    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(1, 'data');
    $this->postJson('/api/pedidos', novoPedido(['data_fim' => '2026-11-01']))->assertStatus(422);
});

it('admin ve todos os pedidos da empresa com user e filtra por estado', function () {
    $admin = User::factory()->admin()->create();
    Pedido::factory()->count(2)->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'estado' => 'aprovado']);
    Sanctum::actingAs($admin);

    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(3, 'data')
        ->assertJsonStructure(['data' => [['id', 'user' => ['id', 'nome']]]]);
    $this->getJson('/api/pedidos?estado=pendente')->assertOk()->assertJsonCount(2, 'data');
});

it('isola dados entre empresas', function () {
    $adminA = User::factory()->admin()->create();
    $pedidoB = Pedido::factory()->create(['empresa_id' => Empresa::factory()->create()->id]);
    Sanctum::actingAs($adminA);

    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(0, 'data');
    $this->postJson("/api/pedidos/{$pedidoB->id}/aprovar")->assertStatus(404);
    $this->postJson("/api/pedidos/{$pedidoB->id}/recusar", ['motivo_recusa' => 'x'])->assertStatus(404);
    expect($pedidoB->refresh()->estado)->toBe('pendente');
});

it('aprova e recusa pedidos pendentes e devolve 409 se ja decididos', function () {
    $admin = User::factory()->admin()->create();
    $a = Pedido::factory()->create(['empresa_id' => $admin->empresa_id]);
    $b = Pedido::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson("/api/pedidos/{$a->id}/aprovar")
        ->assertOk()->assertJsonPath('data.estado', 'aprovado')->assertJsonPath('data.decidido_por', $admin->id);
    $this->postJson("/api/pedidos/{$a->id}/aprovar")->assertStatus(409);
    $this->postJson("/api/pedidos/{$a->id}/recusar", ['motivo_recusa' => 'x'])->assertStatus(409);

    $this->postJson("/api/pedidos/{$b->id}/recusar")->assertStatus(422);
    $this->postJson("/api/pedidos/{$b->id}/recusar", ['motivo_recusa' => 'Sem cobertura'])
        ->assertOk()->assertJsonPath('data.estado', 'recusado')->assertJsonPath('data.motivo_recusa', 'Sem cobertura');
});

it('avisa (sem bloquear) quando as datas se sobrepoem', function () {
    $func = User::factory()->create();
    Pedido::factory()->create([
        'empresa_id' => $func->empresa_id, 'user_id' => $func->id,
        'data_inicio' => '2026-12-03', 'data_fim' => '2026-12-10',
    ]);
    Sanctum::actingAs($func);

    $this->postJson('/api/pedidos', novoPedido())
        ->assertStatus(201)
        ->assertJsonCount(1, 'avisos');
});

it('o seeder e idempotente', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(Empresa::count())->toBe(1)->and(User::count())->toBe(2);
    $this->postJson('/api/login', ['email' => 'admin@vatech.test', 'password' => 'password'])->assertOk();
});

it('permite CORS a partir de localhost:3000', function () {
    $this->call('OPTIONS', '/api/login', [], [], [], [
        'HTTP_ORIGIN' => 'http://localhost:3000',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    ])->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
});

it('oculta os pedidos de funcionarios apagados ao admin', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $ativo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $func->id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $ativo->id]);
    Sanctum::actingAs($admin);

    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(2, 'data');
    $func->delete();
    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_id', $ativo->id);
});

it('permite ao funcionario editar um pedido seu pendente', function () {
    $func = User::factory()->create();
    $pedido = Pedido::factory()->create(['user_id' => $func->id, 'empresa_id' => $func->empresa_id, 'estado' => 'pendente', 'tipo' => 'ausencia', 'subtipo' => 'medica']);
    Sanctum::actingAs($func);

    $this->putJson("/api/pedidos/{$pedido->id}", novoPedido(['data_inicio' => '2026-12-10', 'data_fim' => '2026-12-12']))
        ->assertOk()
        ->assertJsonPath('data.tipo', 'ferias')
        ->assertJsonPath('data.subtipo', null)
        ->assertJsonPath('data.data_inicio', '2026-12-10')
        ->assertJsonPath('data.estado', 'pendente');
});

it('valida o corpo ao editar um pedido', function () {
    $func = User::factory()->create();
    $pedido = Pedido::factory()->create(['user_id' => $func->id, 'empresa_id' => $func->empresa_id, 'estado' => 'pendente']);
    Sanctum::actingAs($func);

    $this->putJson("/api/pedidos/{$pedido->id}", novoPedido(['data_fim' => '2026-11-01']))
        ->assertStatus(422)->assertJsonValidationErrors('data_fim');
});

it('permite ao funcionario apagar um pedido seu pendente', function () {
    $func = User::factory()->create();
    $pedido = Pedido::factory()->create(['user_id' => $func->id, 'empresa_id' => $func->empresa_id, 'estado' => 'pendente']);
    Sanctum::actingAs($func);

    $this->deleteJson("/api/pedidos/{$pedido->id}")->assertStatus(204);
    expect(Pedido::find($pedido->id))->toBeNull();
});

it('nao deixa editar nem apagar pedidos ja decididos (409)', function () {
    $func = User::factory()->create();
    Sanctum::actingAs($func);

    foreach (['aprovado', 'recusado'] as $estado) {
        $pedido = Pedido::factory()->create(['user_id' => $func->id, 'empresa_id' => $func->empresa_id, 'estado' => $estado]);
        $this->putJson("/api/pedidos/{$pedido->id}", novoPedido())->assertStatus(409);
        $this->deleteJson("/api/pedidos/{$pedido->id}")->assertStatus(409);
        expect(Pedido::find($pedido->id))->not->toBeNull();
    }
});

it('devolve 404 ao editar ou apagar pedidos de outro utilizador', function () {
    $func = User::factory()->create();
    $colega = User::factory()->create(['empresa_id' => $func->empresa_id]);
    $alheio = Pedido::factory()->create(['user_id' => $colega->id, 'empresa_id' => $func->empresa_id, 'estado' => 'pendente']);
    Sanctum::actingAs($func);

    $this->putJson("/api/pedidos/{$alheio->id}", novoPedido())->assertStatus(404);
    $this->deleteJson("/api/pedidos/{$alheio->id}")->assertStatus(404);
    expect(Pedido::find($alheio->id))->not->toBeNull();
});

it('o admin nao edita nem apaga pedidos de outros', function () {
    $func = User::factory()->create();
    $pedido = Pedido::factory()->create(['user_id' => $func->id, 'empresa_id' => $func->empresa_id, 'estado' => 'pendente']);
    Sanctum::actingAs(User::factory()->admin()->create(['empresa_id' => $func->empresa_id]));

    $this->putJson("/api/pedidos/{$pedido->id}", novoPedido())->assertStatus(404);
    $this->deleteJson("/api/pedidos/{$pedido->id}")->assertStatus(404);
    expect(Pedido::find($pedido->id))->not->toBeNull();
});

it('devolve 404 ao aprovar ou recusar pedido de funcionario apagado', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $pedido = Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $func->id]);
    Sanctum::actingAs($admin);

    $func->delete();

    $this->postJson("/api/pedidos/{$pedido->id}/aprovar")->assertStatus(404);
    $this->postJson("/api/pedidos/{$pedido->id}/recusar", ['motivo_recusa' => 'x'])->assertStatus(404);
    expect($pedido->refresh()->estado)->toBe('pendente');
});

it('devolve os erros de validacao em portugues', function () {
    $this->postJson('/api/login', [])
        ->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'O campo email é obrigatório.');

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => $admin->email])
        ->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'Já existe um registo com este email.');
});

it('devolve as mensagens de erro do framework em portugues', function () {
    $this->getJson('/api/me')->assertStatus(401)->assertExactJson(['message' => 'Não autenticado.']);

    $this->getJson('/api/rota-inexistente')->assertStatus(404)->assertExactJson(['message' => 'Recurso não encontrado.']);

    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/funcionarios')->assertStatus(403)->assertExactJson(['message' => 'Não tem permissão para esta ação.']);
    $this->deleteJson('/api/login')->assertStatus(405)->assertExactJson(['message' => 'Método não permitido para este recurso.']);
});

it('devolve 429 em portugues quando excede o limite', function () {
    Sanctum::actingAs(User::factory()->create());

    foreach (range(1, 5) as $_) {
        $this->putJson('/api/me', [])->assertStatus(422);
    }

    $this->putJson('/api/me', [])->assertStatus(429)->assertExactJson(['message' => 'Demasiados pedidos. Tente de novo dentro de instantes.']);
});
