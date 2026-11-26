<?php

use App\Models\Convite;
use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\Tipo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function novoTipo(Empresa $empresa, string $base = 'funcionario', array $permissoes = [], string $nome = 'Responsável de RH'): Tipo
{
    return Tipo::create(['empresa_id' => $empresa->id, 'nome' => $nome, 'base' => $base, 'permissoes' => $permissoes]);
}

it('so o admin gere tipos', function () {
    $this->getJson('/api/definicoes/tipos')->assertUnauthorized();

    $empresa = Empresa::factory()->create();
    $tipo = novoTipo($empresa);
    Sanctum::actingAs(User::factory()->create(['empresa_id' => $empresa->id]));

    $this->getJson('/api/definicoes/tipos')->assertForbidden();
    $this->postJson('/api/definicoes/tipos', ['nome' => 'X', 'base' => 'funcionario'])->assertForbidden();
    $this->putJson("/api/definicoes/tipos/{$tipo->id}", ['nome' => 'Y'])->assertForbidden();
    $this->deleteJson("/api/definicoes/tipos/{$tipo->id}")->assertForbidden();
    $this->putJson('/api/funcionarios/1/tipo', ['tipo_id' => null])->assertForbidden();
});

it('cria, lista, edita e apaga um tipo', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $r = $this->postJson('/api/definicoes/tipos', [
        'nome' => 'Responsável de RH', 'base' => 'funcionario',
        'permissoes' => ['aprovar_pedidos' => true, 'ver_presencas_empresa' => true],
    ])->assertCreated()
        ->assertJsonPath('data.nome', 'Responsável de RH')
        ->assertJsonPath('data.base', 'funcionario')
        ->assertJsonPath('data.permissoes.aprovar_pedidos', true)
        ->assertJsonPath('data.permissoes.pedir_ferias', true)
        ->assertJsonPath('data.permissoes.gerir_pontes', false)
        ->assertJsonPath('data.em_uso', 0);
    $id = $r->json('data.id');
    expect($r->json('data.permissoes'))->toHaveCount(14);

    $this->getJson('/api/definicoes/tipos')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);

    $this->putJson("/api/definicoes/tipos/{$id}", ['nome' => 'RH', 'permissoes' => ['gerir_pontes' => true]])
        ->assertOk()
        ->assertJsonPath('data.nome', 'RH')
        ->assertJsonPath('data.permissoes.gerir_pontes', true)
        ->assertJsonPath('data.permissoes.aprovar_pedidos', false);

    $this->deleteJson("/api/definicoes/tipos/{$id}")->assertNoContent();
    expect(Tipo::count())->toBe(0);
});

it('valida o nome: unico sem distinguir maiusculas e reservados', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->postJson('/api/definicoes/tipos', ['nome' => 'Chefe', 'base' => 'funcionario'])->assertCreated();

    $this->postJson('/api/definicoes/tipos', ['nome' => 'CHEFE', 'base' => 'estagiario'])
        ->assertStatus(422)->assertJsonValidationErrors('nome');
    foreach (['Administrador', 'Funcionário', 'funcionario', 'Estagiário'] as $reservado) {
        $this->postJson('/api/definicoes/tipos', ['nome' => $reservado, 'base' => 'funcionario'])
            ->assertStatus(422)->assertJsonValidationErrors('nome');
    }
    $this->postJson('/api/definicoes/tipos', ['nome' => str_repeat('a', 41), 'base' => 'funcionario'])->assertStatus(422);
    $this->postJson('/api/definicoes/tipos', ['nome' => 'Ok', 'base' => 'admin'])->assertStatus(422)->assertJsonValidationErrors('base');
    $this->postJson('/api/definicoes/tipos', ['nome' => 'Ok', 'base' => 'funcionario', 'permissoes' => ['inventada' => true]])->assertStatus(422);
    $this->postJson('/api/definicoes/tipos', ['nome' => 'Ok', 'base' => 'funcionario', 'permissoes' => ['gerir_pontes' => 'sim']])->assertStatus(422);

    $outro = $this->postJson('/api/definicoes/tipos', ['nome' => 'Outro', 'base' => 'funcionario'])->json('data.id');
    $this->putJson("/api/definicoes/tipos/{$outro}", ['nome' => 'chefe'])->assertStatus(422)->assertJsonValidationErrors('nome');
    $this->putJson("/api/definicoes/tipos/{$outro}", ['nome' => 'Outro'])->assertOk();
});

it('a base nao muda', function () {
    $admin = User::factory()->admin()->create();
    $tipo = novoTipo(Empresa::find($admin->empresa_id));
    Sanctum::actingAs($admin);

    $this->putJson("/api/definicoes/tipos/{$tipo->id}", ['base' => 'estagiario'])->assertStatus(422)->assertJsonValidationErrors('base');
    $this->putJson("/api/definicoes/tipos/{$tipo->id}", ['base' => 'funcionario', 'nome' => 'Novo'])->assertOk()->assertJsonPath('data.base', 'funcionario');
});

it('409 ao apagar um tipo em uso por pessoas ou convites pendentes', function () {
    $admin = User::factory()->admin()->create();
    $empresa = Empresa::find($admin->empresa_id);
    Sanctum::actingAs($admin);
    $mensagem = 'Há pessoas com este tipo. Passe-as para outro tipo antes de apagar.';

    $comPessoa = novoTipo($empresa, nome: 'A');
    $pessoa = User::factory()->create(['empresa_id' => $empresa->id, 'tipo_id' => $comPessoa->id]);
    $this->deleteJson("/api/definicoes/tipos/{$comPessoa->id}")->assertStatus(409)->assertJsonPath('message', $mensagem);
    $this->getJson('/api/definicoes/tipos')->assertJsonPath('data.0.em_uso', 1);

    $comConvite = novoTipo($empresa, nome: 'B');
    $convite = Convite::create(['empresa_id' => $empresa->id, 'nome' => 'C', 'email' => 'c@x.test', 'papel' => 'funcionario', 'tipo_id' => $comConvite->id,
        'token' => 'tok-b', 'convidado_por' => $admin->id, 'expira_em' => now()->addDays(7)]);
    $this->deleteJson("/api/definicoes/tipos/{$comConvite->id}")->assertStatus(409)->assertJsonPath('message', $mensagem);

    // Libertado, apaga-se.
    $pessoa->update(['tipo_id' => null]);
    $convite->delete();
    $this->deleteJson("/api/definicoes/tipos/{$comPessoa->id}")->assertNoContent();
    $this->deleteJson("/api/definicoes/tipos/{$comConvite->id}")->assertNoContent();
});

it('um tipo com permissoes proprias da 403 ou 200 nas rotas protegidas', function () {
    $empresa = Empresa::factory()->create();
    $tipo = novoTipo($empresa, 'funcionario', ['aprovar_pedidos' => true, 'ver_presencas_empresa' => true]);
    $comTipo = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario', 'tipo_id' => $tipo->id]);
    $semTipo = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    $colega = User::factory()->create(['empresa_id' => $empresa->id]);
    $pedido = Pedido::create(['empresa_id' => $empresa->id, 'user_id' => $colega->id, 'tipo' => 'ausencia', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02', 'estado' => 'pendente']);

    Sanctum::actingAs($semTipo);
    $this->postJson("/api/pedidos/{$pedido->id}/aprovar")->assertForbidden();
    $this->postJson('/api/pontes', ['data' => '2026-12-24'])->assertForbidden();

    Sanctum::actingAs($comTipo);
    $this->postJson("/api/pedidos/{$pedido->id}/aprovar")->assertOk();
    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => 'a@x.test'])->assertForbidden();
    $this->postJson('/api/pontes', ['data' => '2026-12-24'])->assertForbidden();
    $this->getJson('/api/me')->assertJsonPath('user.permissoes', ['pedir_ferias', 'pedir_ausencia', 'pedir_licenca', 'anexar_documentos', 'marcar_presenca', 'registar_ocorrencias', 'criar_compromissos', 'melhorar_texto', 'aprovar_pedidos', 'ver_presencas_empresa']);
});

it('o tipo pode retirar permissoes do dia a dia', function () {
    $empresa = Empresa::factory()->create();
    $tipo = novoTipo($empresa, 'funcionario', ['marcar_presenca' => false]);
    Sanctum::actingAs(User::factory()->create(['empresa_id' => $empresa->id, 'tipo_id' => $tipo->id]));

    $this->postJson('/api/presencas/entrada')->assertForbidden();
});

it('/me inclui o tipo', function () {
    $empresa = Empresa::factory()->create();
    $tipo = novoTipo($empresa);
    Sanctum::actingAs(User::factory()->create(['empresa_id' => $empresa->id, 'tipo_id' => $tipo->id]));
    $this->getJson('/api/me')->assertJsonPath('user.tipo', ['id' => $tipo->id, 'nome' => 'Responsável de RH']);

    Sanctum::actingAs(User::factory()->create(['empresa_id' => $empresa->id]));
    $this->getJson('/api/me')->assertJsonPath('user.tipo', null);
});

it('convite com tipo cria o utilizador com o tipo e o papel-base', function () {
    $admin = User::factory()->admin()->create();
    $empresa = Empresa::find($admin->empresa_id);
    $tipo = novoTipo($empresa, 'estagiario', nome: 'Responsável por estágios');
    Sanctum::actingAs($admin);

    $r = $this->postJson('/api/funcionarios/convites', ['nome' => 'Rui', 'email' => 'rui@x.test', 'papel' => 'funcionario', 'tipo_id' => $tipo->id])
        ->assertStatus(422)->assertJsonValidationErrors('papel');

    $r = $this->postJson('/api/funcionarios/convites', ['nome' => 'Rui', 'email' => 'rui@x.test', 'tipo_id' => $tipo->id])
        ->assertCreated()
        ->assertJsonPath('data.papel', 'estagiario')
        ->assertJsonPath('data.tipo_id', $tipo->id)
        ->assertJsonPath('data.tipo_nome', 'Responsável por estágios');
    $this->getJson('/api/funcionarios/convites')->assertJsonPath('data.0.tipo_nome', 'Responsável por estágios');

    $token = Convite::first()->token;
    $this->postJson("/api/convites/{$token}/aceitar", ['password' => 'segredo123', 'password_confirmation' => 'segredo123', 'aceita_termos' => true])->assertCreated();
    $user = User::where('email', 'rui@x.test')->first();
    expect($user->papel)->toBe('estagiario')->and($user->tipo_id)->toBe($tipo->id);

    // Convite sem tipo: tipo_id e tipo_nome nulos.
    $this->postJson('/api/funcionarios/convites', ['nome' => 'Sem', 'email' => 'sem@x.test'])
        ->assertCreated()->assertJsonPath('data.tipo_id', null)->assertJsonPath('data.tipo_nome', null);

    // Tipo de outra empresa.
    $alheio = novoTipo(Empresa::factory()->create(), nome: 'Alheio');
    $this->postJson('/api/funcionarios/convites', ['nome' => 'X', 'email' => 'x@x.test', 'tipo_id' => $alheio->id])
        ->assertStatus(422)->assertJsonValidationErrors('tipo_id');
});

it('base estagiario mantem as regras de estagio e sem ferias por predefinicao', function () {
    $empresa = Empresa::factory()->create();
    $tipo = novoTipo($empresa, 'estagiario', ['aprovar_pedidos' => true], 'Tutor');
    $user = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'estagiario', 'tipo_id' => $tipo->id]);
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'T', 'email' => $user->email, 'estagio_inicio' => '2026-09-01', 'estagio_fim' => '2026-12-01'])->assertOk();
    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'])->assertForbidden();
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'])->assertCreated();

    // Um funcionario com tipo-base funcionario continua sem datas de estagio.
    $f = novoTipo($empresa, 'funcionario', nome: 'Normal');
    $func = User::factory()->create(['empresa_id' => $empresa->id, 'tipo_id' => $f->id]);
    Sanctum::actingAs($func);
    $this->putJson('/api/me', ['nome' => 'F', 'email' => $func->email, 'estagio_inicio' => '2026-09-01'])->assertStatus(422);
});

it('lista pessoas com tipo e muda o tipo de uma pessoa', function () {
    $admin = User::factory()->admin()->create();
    $empresa = Empresa::find($admin->empresa_id);
    $tipo = novoTipo($empresa, 'estagiario', nome: 'Tutor');
    $pessoa = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => $tipo->id])
        ->assertOk()
        ->assertJsonPath('data.id', $pessoa->id)
        ->assertJsonPath('data.papel', 'estagiario')
        ->assertJsonPath('data.tipo_id', $tipo->id)
        ->assertJsonPath('data.tipo_nome', 'Tutor');

    $lista = collect($this->getJson('/api/funcionarios')->assertOk()->json('data'))->firstWhere('id', $pessoa->id);
    expect($lista['tipo_id'])->toBe($tipo->id)->and($lista['tipo_nome'])->toBe('Tutor');

    // null tira o tipo sem mexer no papel.
    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => null])
        ->assertOk()->assertJsonPath('data.tipo_id', null)->assertJsonPath('data.tipo_nome', null)->assertJsonPath('data.papel', 'estagiario');

    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", [])->assertStatus(422);
    $this->putJson("/api/funcionarios/{$admin->id}/tipo", ['tipo_id' => $tipo->id])->assertStatus(422);
});

it('isola tipos e pessoas entre empresas', function () {
    $admin = User::factory()->admin()->create();
    $outraEmpresa = Empresa::factory()->create();
    $alheio = novoTipo($outraEmpresa, nome: 'Alheio');
    $pessoaAlheia = User::factory()->create(['empresa_id' => $outraEmpresa->id]);
    $minhaPessoa = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->getJson('/api/definicoes/tipos')->assertJsonCount(0, 'data');
    $this->putJson("/api/definicoes/tipos/{$alheio->id}", ['nome' => 'X'])->assertNotFound();
    $this->deleteJson("/api/definicoes/tipos/{$alheio->id}")->assertNotFound();
    $this->putJson("/api/funcionarios/{$pessoaAlheia->id}/tipo", ['tipo_id' => null])->assertNotFound();
    $this->putJson("/api/funcionarios/{$minhaPessoa->id}/tipo", ['tipo_id' => $alheio->id])->assertNotFound();

    // O mesmo nome pode existir noutra empresa.
    $this->postJson('/api/definicoes/tipos', ['nome' => 'Alheio', 'base' => 'funcionario'])->assertCreated();
});

it('muda o papel de uma pessoa sem tipo e ignora o papel enviado com tipo', function () {
    $admin = User::factory()->admin()->create();
    $empresa = Empresa::find($admin->empresa_id);
    $tipo = novoTipo($empresa, 'estagiario', nome: 'Tutor');
    $pessoa = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => null, 'papel' => 'estagiario'])
        ->assertOk()->assertJsonPath('data.papel', 'estagiario')->assertJsonPath('data.tipo_id', null);
    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => null, 'papel' => 'funcionario'])
        ->assertOk()->assertJsonPath('data.papel', 'funcionario');

    // Com tipo, o papel é o da base (o enviado é ignorado).
    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => $tipo->id, 'papel' => 'funcionario'])
        ->assertOk()->assertJsonPath('data.papel', 'estagiario')->assertJsonPath('data.tipo_id', $tipo->id);

    $this->putJson("/api/funcionarios/{$pessoa->id}/tipo", ['tipo_id' => null, 'papel' => 'admin'])->assertStatus(422);
    $this->putJson("/api/funcionarios/{$admin->id}/tipo", ['tipo_id' => null, 'papel' => 'funcionario'])->assertStatus(422);
    expect($admin->refresh()->papel)->toBe('admin');
});
