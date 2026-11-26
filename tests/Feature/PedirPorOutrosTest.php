<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\Tipo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** Pessoa de um papel com só as permissões dadas ligadas (as restantes desligadas). */
function pessoaCom(Empresa $empresa, array $ligadas, string $papel = 'funcionario'): User
{
    $todas = array_fill_keys(Empresa::chavesPermissoes(), false);
    $empresa->update(['permissoes' => [
        ...($empresa->permissoes ?? []),
        $papel => [...$todas, ...array_fill_keys($ligadas, true)],
    ]]);

    return User::factory()->create(['empresa_id' => $empresa->id, 'papel' => $papel]);
}

function corpoPedido(array $extra = []): array
{
    return ['tipo' => 'ferias', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-02', ...$extra];
}

it('a permissao pedir_por_outros esta no catalogo, no grupo gestao, fora das predefinicoes', function () {
    expect(Empresa::chavesPermissoes())->toContain('pedir_por_outros')->toHaveCount(16);
    $linha = collect(Empresa::PERMISSOES_CATALOGO)->firstWhere(0, 'pedir_por_outros');
    expect($linha[1])->toBe('Fazer pedidos em nome de outras pessoas')->and($linha[2])->toBe('gestao');
    foreach (['funcionario', 'estagiario'] as $papel) {
        expect(Empresa::permissoesPredefinidas($papel)['pedir_por_outros'])->toBeFalse();
    }
});

it('sem a permissao, pedir em nome de outro da 403 e nada se cria', function () {
    $empresa = Empresa::factory()->create();
    $autor = pessoaCom($empresa, ['pedir_ferias']);
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);
    Sanctum::actingAs($autor);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))
        ->assertForbidden()->assertExactJson(['message' => 'Sem permissão.']);
    expect(Pedido::count())->toBe(0);
});

it('user_id igual ao proprio ou em falta mantem o comportamento actual', function () {
    $f = User::factory()->create();
    Sanctum::actingAs($f);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $f->id]))
        ->assertCreated()->assertJsonPath('data.user_id', $f->id)->assertJsonPath('data.criado_por', null);
    $this->postJson('/api/pedidos', corpoPedido(['data_inicio' => '2027-04-05', 'data_fim' => '2027-04-06']))
        ->assertCreated()->assertJsonPath('data.criado_por', null);
});

it('o admin cria em nome de outra pessoa: fica pendente, da pessoa, com criado_por', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))
        ->assertCreated()
        ->assertJsonPath('data.user_id', $alvo->id)
        ->assertJsonPath('data.estado', 'pendente')
        ->assertJsonPath('data.decidido_por', null)
        ->assertJsonPath('data.criado_por', ['id' => $admin->id, 'nome' => $admin->nome]);

    $pedido = Pedido::firstOrFail();
    expect($pedido->user_id)->toBe($alvo->id)->and($pedido->getRawOriginal('criado_por'))->toBe($admin->id);
});

it('licenca em nome de outro nao fica aprovada sozinha', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-01', 'user_id' => $alvo->id])
        ->assertCreated()->assertJsonPath('data.estado', 'pendente');
});

it('quem tem a permissao so cria os tipos para que o autor tem permissao pedir_*', function () {
    $empresa = Empresa::factory()->create();
    $autor = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ausencia']);
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);
    Sanctum::actingAs($autor);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertForbidden();
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-01', 'user_id' => $alvo->id])
        ->assertCreated()->assertJsonPath('data.user_id', $alvo->id)->assertJsonPath('data.criado_por.id', $autor->id);
});

it('a permissao pode vir de um tipo personalizado', function () {
    $empresa = Empresa::factory()->create();
    $tipo = Tipo::create(['empresa_id' => $empresa->id, 'nome' => 'Coordenacao', 'base' => 'funcionario', 'permissoes' => ['pedir_por_outros' => true]]);
    $autor = User::factory()->create(['empresa_id' => $empresa->id, 'tipo_id' => $tipo->id]);
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);
    Sanctum::actingAs($autor);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertCreated();
});

it('pessoa de outra empresa da 404 sem revelar nada e nao cria', function () {
    $admin = User::factory()->admin()->create();
    $estranho = User::factory()->create();
    Sanctum::actingAs($admin);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $estranho->id]))->assertNotFound();
    $this->postJson('/api/pedidos', corpoPedido(['user_id' => 999999]))->assertNotFound();
    expect(Pedido::count())->toBe(0);
});

it('pessoa recusada, por autorizar ou apagada e rejeitada', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    foreach (['pendente', 'recusado'] as $estado) {
        $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
        $u->forceFill(['estado_conta' => $estado])->save();
        $this->postJson('/api/pedidos', corpoPedido(['user_id' => $u->id]))->assertNotFound();
    }
    $apagado = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $apagado->delete();
    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $apagado->id]))->assertNotFound();
    expect(Pedido::count())->toBe(0);
});

it('user_id invalido da 422', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->postJson('/api/pedidos', corpoPedido(['user_id' => 'abc']))->assertStatus(422)->assertJsonValidationErrors('user_id');
});

it('os limites de ferias contam na pessoa-alvo, nao no autor', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    // 25 dias uteis ja usados pela pessoa-alvo em 2027 (4 jan a 5 fev).
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'estado' => 'aprovado', 'data_inicio' => '2027-01-04', 'data_fim' => '2027-02-05']);
    Sanctum::actingAs($admin);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id, 'data_inicio' => '2027-02-08', 'data_fim' => '2027-02-08']))
        ->assertStatus(422)->assertJsonValidationErrors('data_fim');
    // O mesmo pedido para si (admin sem ferias usadas) passa.
    $this->postJson('/api/pedidos', corpoPedido(['data_inicio' => '2027-02-08', 'data_fim' => '2027-02-08']))->assertCreated();
});

it('a sobreposicao avisa sobre a pessoa-alvo, nao sobre o autor', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-05']);
    Sanctum::actingAs($admin);

    $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertCreated()->assertJsonPath('avisos.0', 'As datas sobrepõem-se a outro pedido seu.');
    $this->postJson('/api/pedidos', corpoPedido())->assertCreated()->assertJsonMissingPath('avisos');
});

it('o dono nao decide o pedido feito em seu nome; o autor decide so se tiver aprovar_pedidos', function () {
    $empresa = Empresa::factory()->create();
    $autor = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ferias', 'aprovar_pedidos']);
    $semAprovar = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ferias'], 'estagiario');
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);

    Sanctum::actingAs($autor);
    $id = $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertCreated()->json('data.id');
    $this->postJson("/api/pedidos/{$id}/aprovar")->assertOk()->assertJsonPath('data.estado', 'aprovado')->assertJsonPath('data.criado_por.id', $autor->id);

    // Sem aprovar_pedidos o autor nao decide (middleware).
    Sanctum::actingAs($semAprovar);
    $id2 = $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id, 'data_inicio' => '2027-05-03', 'data_fim' => '2027-05-04']))->assertCreated()->json('data.id');
    $this->postJson("/api/pedidos/{$id2}/aprovar")->assertForbidden();

    // Um pedido do proprio autor nunca o decide ele.
    Sanctum::actingAs($autor);
    $meu = $this->postJson('/api/pedidos', corpoPedido(['data_inicio' => '2027-06-07', 'data_fim' => '2027-06-08']))->assertCreated()->json('data.id');
    $this->postJson("/api/pedidos/{$meu}/aprovar")->assertForbidden();
    $this->postJson("/api/pedidos/{$meu}/recusar", ['motivo_recusa' => 'x'])->assertForbidden();
});

it('auto-aprovacao impossivel: o admin que cria para outro nao ve o pedido aprovado nem decidido', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $r = $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertCreated();
    expect($r->json('data.estado'))->toBe('pendente')->and($r->json('data.decidido_em'))->toBeNull();

    // O alvo, sem aprovar_pedidos, nao consegue aprovar o que foi feito em seu nome.
    Sanctum::actingAs($alvo);
    $this->postJson('/api/pedidos/'.$r->json('data.id').'/aprovar')->assertForbidden();
});

it('o autor edita e cancela enquanto pendente; so quem tem a permissao; aprovado da 409', function () {
    $empresa = Empresa::factory()->create();
    $autor = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ferias']);
    $outro = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ferias']);
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);
    Sanctum::actingAs($autor);
    $id = $this->postJson('/api/pedidos', corpoPedido(['user_id' => $alvo->id]))->assertCreated()->json('data.id');

    $this->putJson("/api/pedidos/{$id}", corpoPedido(['data_fim' => '2027-03-03']))
        ->assertOk()->assertJsonPath('data.data_fim', '2027-03-03')->assertJsonPath('data.user_id', $alvo->id)->assertJsonPath('data.criado_por.id', $autor->id);
    // user_id no PUT nao muda o dono.
    $this->putJson("/api/pedidos/{$id}", corpoPedido(['user_id' => $outro->id]))->assertOk()->assertJsonPath('data.user_id', $alvo->id);

    Sanctum::actingAs($outro);
    $this->putJson("/api/pedidos/{$id}", corpoPedido())->assertNotFound();
    $this->deleteJson("/api/pedidos/{$id}")->assertNotFound();

    Sanctum::actingAs($autor);
    $this->deleteJson("/api/pedidos/{$id}")->assertNoContent();

    $aprovado = Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $alvo->id, 'criado_por' => $autor->id, 'estado' => 'aprovado']);
    $this->deleteJson("/api/pedidos/{$aprovado->id}")->assertStatus(409);
});

it('o admin apaga tambem pedidos aprovados que criou por outros', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $p = Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'criado_por' => $admin->id, 'estado' => 'aprovado']);
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/pedidos/{$p->id}")->assertNoContent();
});

it('criado_por so vem preenchido quando o autor e outra pessoa; a lista traz-o', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'criado_por' => $alvo->id]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'criado_por' => $admin->id, 'data_inicio' => '2027-08-02', 'data_fim' => '2027-08-03']);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $alvo->id, 'data_inicio' => '2027-09-06', 'data_fim' => '2027-09-07']);
    Sanctum::actingAs($admin);

    $dados = collect($this->getJson('/api/pedidos')->assertOk()->json('data'));
    expect($dados->pluck('criado_por')->filter()->values()->all())->toBe([['id' => $admin->id, 'nome' => $admin->nome]])
        ->and($dados->where('criado_por', null)->count())->toBe(2);
});

it('o dono ve o pedido feito em seu nome, e o autor sem aprovar_pedidos ve o que criou', function () {
    $empresa = Empresa::factory()->create();
    $autor = pessoaCom($empresa, ['pedir_por_outros', 'pedir_ferias']);
    $alvo = User::factory()->create(['empresa_id' => $empresa->id]);
    $alheio = User::factory()->create(['empresa_id' => $empresa->id]);
    Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $alvo->id, 'criado_por' => $autor->id]);
    Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $alheio->id, 'data_inicio' => '2027-08-02', 'data_fim' => '2027-08-03']);

    Sanctum::actingAs($alvo);
    $this->getJson('/api/pedidos')->assertJsonCount(1, 'data')->assertJsonPath('data.0.criado_por.id', $autor->id);
    Sanctum::actingAs($autor);
    $this->getJson('/api/pedidos')->assertJsonCount(1, 'data')->assertJsonPath('data.0.user.id', $alvo->id);
    Sanctum::actingAs($alheio);
    $this->getJson('/api/pedidos')->assertJsonCount(1, 'data')->assertJsonPath('data.0.criado_por', null);
});

it('GET /pedidos/pessoas: 403 sem a permissao', function () {
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/pedidos/pessoas')->assertForbidden()->assertExactJson(['message' => 'Sem permissão.']);
});

it('GET /pedidos/pessoas devolve as activas da empresa por nome, sem o autor e sem outras empresas', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->admin()->create(['empresa_id' => $empresa->id, 'nome' => 'Zeca Admin']);
    $tipo = Tipo::create(['empresa_id' => $empresa->id, 'nome' => 'Coordenacao', 'base' => 'funcionario']);
    $b = User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Beatriz', 'tipo_id' => $tipo->id]);
    $a = User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Ana', 'papel' => 'estagiario']);
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Pendente'])->forceFill(['estado_conta' => 'pendente'])->save();
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Recusada'])->forceFill(['estado_conta' => 'recusado'])->save();
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Apagada'])->delete();
    User::factory()->create(['nome' => 'Outra Empresa']);
    Sanctum::actingAs($admin);

    $r = $this->getJson('/api/pedidos/pessoas')->assertOk();
    expect($r->json('data'))->toBe([
        ['id' => $a->id, 'nome' => 'Ana', 'avatar_url' => null, 'papel' => 'estagiario', 'tipo_nome' => null],
        ['id' => $b->id, 'nome' => 'Beatriz', 'avatar_url' => null, 'papel' => 'funcionario', 'tipo_nome' => 'Coordenacao'],
    ]);
});

it('GET /pedidos/pessoas e a lista de pedidos fazem o mesmo nº de queries com mais pessoas e pedidos', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $criar = function (int $n) use ($admin) {
        foreach (range(1, $n) as $i) {
            $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
            Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $u->id, 'criado_por' => $admin->id, 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-02']);
        }
    };
    $contar = function (string $url) {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson($url)->assertOk();
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $n;
    };

    $criar(2);
    $pessoas2 = $contar('/api/pedidos/pessoas');
    $pedidos2 = $contar('/api/pedidos');
    $criar(10);
    expect($contar('/api/pedidos/pessoas'))->toBe($pessoas2)
        ->and($contar('/api/pedidos'))->toBe($pedidos2);
    $this->getJson('/api/pedidos/pessoas')->assertJsonCount(12, 'data');
});
