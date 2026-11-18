<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
    $this->postJson('/api/funcionarios', [])->assertStatus(403);
    $this->postJson('/api/pedidos/1/aprovar')->assertStatus(403);
});

it('devolve 403 ao admin ao criar pedido', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/pedidos', novoPedido())->assertStatus(403);
});

it('faz logout e devolve /me', function () {
    $user = User::factory()->create();
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)->getJson('/api/me')->assertOk()->assertJsonPath('user.id', $user->id);
    $this->withToken($token)->postJson('/api/logout')->assertStatus(204);
    expect($user->tokens()->count())->toBe(0);
});

it('admin cria e lista funcionarios da sua empresa', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->create(['empresa_id' => $admin->empresa_id]);
    User::factory()->create(); // outra empresa
    Sanctum::actingAs($admin);

    $this->postJson('/api/funcionarios', ['nome' => 'Ana', 'email' => 'ana@x.test', 'password' => 'segredo123'])
        ->assertStatus(201)
        ->assertJsonPath('data.papel', 'funcionario')
        ->assertJsonPath('data.empresa_id', $admin->empresa_id);

    $this->getJson('/api/funcionarios')->assertOk()->assertJsonCount(2, 'data');
    $this->postJson('/api/funcionarios', ['nome' => 'Ana'])->assertStatus(422);
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

it('admin edita funcionario, com password opcional e email unico', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id, 'email' => 'f@x.test']);
    $outro = User::factory()->create(['empresa_id' => $admin->empresa_id, 'email' => 'o@x.test']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$func->id}", ['nome' => 'Novo', 'email' => 'f@x.test'])
        ->assertOk()->assertJsonPath('data.nome', 'Novo')->assertJsonPath('data.email', 'f@x.test');
    expect(Hash::check('password', $func->refresh()->password))->toBeTrue();

    $this->putJson("/api/funcionarios/{$func->id}", ['nome' => 'Novo', 'email' => 'novo@x.test', 'password' => 'outrasenha1'])
        ->assertOk();
    expect(Hash::check('outrasenha1', $func->refresh()->password))->toBeTrue();

    $this->putJson("/api/funcionarios/{$func->id}", ['nome' => 'Novo', 'email' => $outro->email])->assertStatus(422);
    $this->putJson("/api/funcionarios/{$func->id}", ['nome' => 'Novo'])->assertStatus(422);
});

it('devolve 404 ao editar ou apagar de outra empresa, inexistente ou nao funcionario', function () {
    $admin = User::factory()->admin()->create();
    $alheio = User::factory()->create();
    $outroAdmin = User::factory()->admin()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    $dados = ['nome' => 'X', 'email' => 'x@x.test'];

    foreach ([$alheio->id, $outroAdmin->id, 99999] as $id) {
        $this->putJson("/api/funcionarios/{$id}", $dados)->assertStatus(404);
        $this->deleteJson("/api/funcionarios/{$id}")->assertStatus(404);
    }
    expect(User::find($alheio->id))->not->toBeNull();
});

it('devolve 403 ao funcionario a editar ou apagar funcionarios', function () {
    $func = User::factory()->create();
    Sanctum::actingAs($func);

    $this->putJson("/api/funcionarios/{$func->id}", [])->assertStatus(403);
    $this->deleteJson("/api/funcionarios/{$func->id}")->assertStatus(403);
});

it('apaga funcionario (soft delete): sai da lista, perde tokens e nao faz login', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id, 'email' => 'f@x.test']);
    $token = $func->createToken('t')->plainTextToken;
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/funcionarios/{$func->id}")->assertStatus(204);

    $this->getJson('/api/funcionarios')->assertOk()->assertJsonCount(0, 'data');
    expect(User::withTrashed()->find($func->id)->trashed())->toBeTrue()
        ->and($func->tokens()->count())->toBe(0);
    $this->postJson('/api/login', ['email' => 'f@x.test', 'password' => 'password'])->assertStatus(422);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/me')->assertStatus(401);
});

it('oculta os pedidos de funcionarios apagados ao admin', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $ativo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $func->id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $ativo->id]);
    Sanctum::actingAs($admin);

    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(2, 'data');
    $this->deleteJson("/api/funcionarios/{$func->id}")->assertStatus(204);
    $this->getJson('/api/pedidos')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_id', $ativo->id);
});

it('nao deixa criar funcionario com o email de um apagado', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id, 'email' => 'f@x.test']);
    Sanctum::actingAs($admin);
    $this->deleteJson("/api/funcionarios/{$func->id}")->assertStatus(204);

    $this->postJson('/api/funcionarios', ['nome' => 'Outro', 'email' => 'f@x.test', 'password' => 'segredo123'])
        ->assertStatus(422)->assertJsonValidationErrors('email');
});

it('devolve 404 antes de validar o body no PUT de funcionario alheio ou inexistente', function () {
    $admin = User::factory()->admin()->create();
    $alheio = User::factory()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$alheio->id}", [])->assertStatus(404);
    $this->putJson('/api/funcionarios/99999', ['email' => 'invalido'])->assertStatus(404);
});
