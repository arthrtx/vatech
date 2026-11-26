<?php

use App\Models\Empresa;
use App\Models\Ocorrencia;
use App\Models\Pedido;
use App\Models\Presenca;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** Utilizador de um papel com apenas as permissões dadas ligadas (as restantes desligadas). */
function comPermissoes(string $papel, array $ligadas, ?Empresa $empresa = null): User
{
    $empresa ??= Empresa::factory()->create();
    $todas = array_fill_keys(Empresa::chavesPermissoes(), false);
    $empresa->update(['permissoes' => [
        ...($empresa->permissoes ?? []),
        $papel => [...$todas, ...array_fill_keys($ligadas, true)],
    ]]);

    return User::factory()->create(['empresa_id' => $empresa->id, 'papel' => $papel]);
}

it('devolve catalogo e predefinidos', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $r = $this->getJson('/api/definicoes/permissoes')->assertOk();
    $r->assertJsonCount(12, 'data.catalogo')
        ->assertJsonPath('data.catalogo.0', ['chave' => 'pedir_ferias', 'rotulo' => 'Pedir férias', 'grupo' => 'dia_a_dia'])
        ->assertJsonPath('data.catalogo.8', ['chave' => 'aprovar_pedidos', 'rotulo' => 'Aprovar e recusar pedidos da equipa', 'grupo' => 'gestao'])
        ->assertJsonPath('data.papeis.funcionario.pedir_ferias', true)
        ->assertJsonPath('data.papeis.funcionario.aprovar_pedidos', false)
        ->assertJsonPath('data.papeis.estagiario.pedir_ferias', false)
        ->assertJsonPath('data.papeis.estagiario.marcar_presenca', true)
        ->assertJsonPath('data.papeis.estagiario.convidar_pessoas', false);
});

it('o admin edita e a alteracao persiste; chaves em falta ficam no predefinido', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->putJson('/api/definicoes/permissoes', ['papeis' => [
        'funcionario' => ['aprovar_pedidos' => true, 'marcar_presenca' => false],
        'estagiario' => ['pedir_ferias' => true],
    ]])->assertOk()
        ->assertJsonPath('data.papeis.funcionario.aprovar_pedidos', true)
        ->assertJsonPath('data.papeis.funcionario.marcar_presenca', false)
        ->assertJsonPath('data.papeis.funcionario.pedir_ferias', true)
        ->assertJsonPath('data.papeis.estagiario.pedir_ferias', true);

    $this->getJson('/api/definicoes/permissoes')
        ->assertJsonPath('data.papeis.funcionario.aprovar_pedidos', true)
        ->assertJsonPath('data.papeis.estagiario.pedir_ferias', true);

    // Um PUT seguinte sem a chave volta ao predefinido.
    $this->putJson('/api/definicoes/permissoes', ['papeis' => ['funcionario' => []]])
        ->assertJsonPath('data.papeis.funcionario.aprovar_pedidos', false)
        ->assertJsonPath('data.papeis.estagiario.pedir_ferias', false);
});

it('so o admin le e edita as permissoes', function (string $papel) {
    Sanctum::actingAs(User::factory()->create(['papel' => $papel]));

    $this->getJson('/api/definicoes/permissoes')->assertForbidden();
    $this->putJson('/api/definicoes/permissoes', ['papeis' => []])->assertForbidden();
})->with(['funcionario', 'estagiario']);

it('rejeita chaves fora do catalogo, valores nao booleanos e papeis invalidos', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson('/api/definicoes/permissoes', ['papeis' => ['funcionario' => ['voar' => true]]])
        ->assertStatus(422)->assertJsonValidationErrors('papeis.funcionario.voar');
    $this->putJson('/api/definicoes/permissoes', ['papeis' => ['funcionario' => ['pedir_ferias' => 'talvez']]])
        ->assertStatus(422)->assertJsonValidationErrors('papeis.funcionario.pedir_ferias');
    $this->putJson('/api/definicoes/permissoes', ['papeis' => ['admin' => ['pedir_ferias' => false]]])
        ->assertStatus(422)->assertJsonValidationErrors('papeis.admin');
    $this->putJson('/api/definicoes/permissoes', [])->assertStatus(422);
});

it('/me traz as permissoes concedidas; o admin traz as 12', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->getJson('/api/me')->assertOk()
        ->assertJsonCount(12, 'user.permissoes')
        ->assertJsonFragment(['permissoes' => Empresa::chavesPermissoes()]);

    $func = comPermissoes('funcionario', ['pedir_ferias', 'aprovar_pedidos']);
    Sanctum::actingAs($func);
    $this->getJson('/api/me')->assertJsonPath('user.permissoes', ['pedir_ferias', 'aprovar_pedidos']);

    Sanctum::actingAs(User::factory()->create(['papel' => 'estagiario']));
    $p = $this->getJson('/api/me')->json('user.permissoes');
    expect($p)->not->toContain('pedir_ferias')->toContain('pedir_ausencia')->not->toContain('aprovar_pedidos');
});

it('o admin tem sempre tudo, mesmo que a empresa tenha permissoes gravadas', function () {
    $empresa = Empresa::factory()->create(['permissoes' => ['funcionario' => array_fill_keys(Empresa::chavesPermissoes(), false)]]);
    $admin = User::factory()->admin()->create(['empresa_id' => $empresa->id]);

    foreach (Empresa::chavesPermissoes() as $chave) {
        expect($admin->temPermissao($chave))->toBeTrue();
    }
});

it('o estagiario predefinido ainda nao pede ferias, mas pede ausencia e licenca', function () {
    Sanctum::actingAs(User::factory()->create(['papel' => 'estagiario']));
    $base = ['data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'];

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', ...$base])->assertForbidden()->assertJsonPath('message', 'Sem permissão.');
    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', ...$base])->assertCreated();
    $this->postJson('/api/pedidos', ['tipo' => 'licenca', ...$base])->assertCreated();
});

it('cada tipo de pedido exige a sua permissao', function (string $tipo, string $chave) {
    $base = ['data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'];

    Sanctum::actingAs(comPermissoes('funcionario', []));
    $this->postJson('/api/pedidos', ['tipo' => $tipo, ...$base])->assertForbidden()->assertJsonPath('message', 'Sem permissão.');

    Sanctum::actingAs(comPermissoes('funcionario', [$chave]));
    $this->postJson('/api/pedidos', ['tipo' => $tipo, ...$base])->assertCreated();
})->with([['ferias', 'pedir_ferias'], ['ausencia', 'pedir_ausencia'], ['licenca', 'pedir_licenca']]);

it('um estagiario com pedir_ferias passa a pedir ferias', function () {
    Sanctum::actingAs(comPermissoes('estagiario', ['pedir_ferias']));

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02'])->assertCreated();
});

it('anexar documentos exige a permissao', function () {
    $func = comPermissoes('funcionario', ['pedir_ausencia']);
    $pedido = Pedido::factory()->create(['empresa_id' => $func->empresa_id, 'user_id' => $func->id, 'estado' => 'pendente']);
    Sanctum::actingAs($func);

    $this->post("/api/pedidos/{$pedido->id}/anexos", [], ['Accept' => 'application/json'])->assertForbidden();
    $this->deleteJson("/api/pedidos/{$pedido->id}/anexos/1")->assertForbidden();

    Empresa::find($func->empresa_id)->update(['permissoes' => ['funcionario' => ['anexar_documentos' => true]]]);
    $this->postJson("/api/pedidos/{$pedido->id}/anexos", [])->assertStatus(422);
    $this->deleteJson("/api/pedidos/{$pedido->id}/anexos/999")->assertNotFound();
});

it('marcar presenca exige a permissao', function () {
    $sem = comPermissoes('funcionario', []);
    Sanctum::actingAs($sem);
    $this->getJson('/api/presencas/hoje')->assertForbidden();
    $this->postJson('/api/presencas/entrada')->assertForbidden();
    $this->postJson('/api/presencas/saida')->assertForbidden();
    $this->postJson('/api/presencas/atrasada', [])->assertForbidden();
    $this->putJson('/api/me/almoco', [])->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['marcar_presenca']));
    $this->postJson('/api/presencas/entrada')->assertCreated();
    $this->getJson('/api/presencas/hoje')->assertOk();
});

it('registar ocorrencias exige a permissao', function () {
    $corpo = ['data' => now('Europe/Lisbon')->toDateString(), 'tipo' => 'falta', 'motivo' => 'outro', 'descricao' => 'Teste'];
    Sanctum::actingAs(comPermissoes('funcionario', []));
    $this->postJson('/api/ocorrencias', $corpo)->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['registar_ocorrencias']));
    $this->postJson('/api/ocorrencias', $corpo)->assertCreated();
});

it('compromissos exigem a permissao para criar e apagar', function () {
    Sanctum::actingAs(comPermissoes('funcionario', []));
    $this->postJson('/api/compromissos', [])->assertForbidden();
    $this->deleteJson('/api/compromissos/1')->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['criar_compromissos']));
    $this->postJson('/api/compromissos', [])->assertStatus(422);
    $this->deleteJson('/api/compromissos/999')->assertNotFound();
});

it('o melhorador de texto exige a permissao', function () {
    Http::fake(['api.languagetool.org/*' => Http::response(['matches' => []])]);

    Sanctum::actingAs(comPermissoes('funcionario', []));
    $this->postJson('/api/texto/melhorar', ['texto' => 'peco ferias'])->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['melhorar_texto']));
    $this->postJson('/api/texto/melhorar', ['texto' => 'peco ferias'])->assertOk();
});

it('gerir pontes exige a permissao', function () {
    Sanctum::actingAs(comPermissoes('funcionario', []));
    $this->postJson('/api/pontes', [])->assertForbidden();
    $this->deleteJson('/api/pontes/1')->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['gerir_pontes']));
    $this->postJson('/api/pontes', [])->assertStatus(422);
    $this->deleteJson('/api/pontes/999')->assertNotFound();
});

it('convidar pessoas exige a permissao', function () {
    $sem = comPermissoes('funcionario', []);
    Sanctum::actingAs($sem);
    $this->getJson('/api/funcionarios/convites')->assertForbidden();
    $this->postJson('/api/funcionarios/convites', [])->assertForbidden();
    $this->postJson('/api/funcionarios/convites/1/reenviar')->assertForbidden();
    $this->deleteJson('/api/funcionarios/convites/1')->assertForbidden();

    Sanctum::actingAs(comPermissoes('funcionario', ['convidar_pessoas']));
    $this->getJson('/api/funcionarios/convites')->assertOk();
    $this->postJson('/api/funcionarios/convites', [])->assertStatus(422);
});

it('aprovar pedidos exige a permissao e nunca o proprio pedido', function () {
    $empresa = Empresa::factory()->create();
    $chefe = comPermissoes('funcionario', ['aprovar_pedidos'], $empresa);
    $sem = comPermissoes('estagiario', [], $empresa);
    $outro = User::factory()->create(['empresa_id' => $empresa->id]);
    $deOutro = Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $outro->id, 'estado' => 'pendente']);
    $proprio = Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $chefe->id, 'estado' => 'pendente']);

    Sanctum::actingAs($sem);
    $this->postJson("/api/pedidos/{$deOutro->id}/aprovar")->assertForbidden();
    $this->postJson("/api/pedidos/{$deOutro->id}/visto")->assertForbidden();
    $this->postJson("/api/pedidos/{$deOutro->id}/recusar", ['motivo_recusa' => 'x'])->assertForbidden();

    Sanctum::actingAs($chefe);
    $this->postJson("/api/pedidos/{$proprio->id}/aprovar")->assertForbidden();
    $this->postJson("/api/pedidos/{$deOutro->id}/aprovar")->assertOk()->assertJsonPath('data.estado', 'aprovado');
    expect($proprio->refresh()->estado)->toBe('pendente');
});

it('aprovar pedidos alarga a leitura de pedidos e agenda; sem a permissao so os proprios', function () {
    $empresa = Empresa::factory()->create();
    $chefe = comPermissoes('funcionario', ['aprovar_pedidos'], $empresa);
    $sem = comPermissoes('estagiario', [], $empresa);
    $outro = User::factory()->create(['empresa_id' => $empresa->id]);
    Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $outro->id, 'estado' => 'pendente', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02']);
    Pedido::factory()->create(['empresa_id' => $empresa->id, 'user_id' => $sem->id, 'estado' => 'pendente', 'data_inicio' => '2026-12-01', 'data_fim' => '2026-12-02']);

    Sanctum::actingAs($chefe);
    $this->getJson('/api/pedidos')->assertJsonCount(2, 'data')->assertJsonPath('data.0.user.nome', fn ($n) => is_string($n));
    $this->getJson('/api/agenda?de=2026-12-01&ate=2026-12-31')->assertJsonCount(2, 'data');

    Sanctum::actingAs($sem);
    $this->getJson('/api/pedidos')->assertJsonCount(1, 'data');
    $this->getJson('/api/agenda?de=2026-12-01&ate=2026-12-31')->assertJsonCount(1, 'data');

    // Continuam so admin: lista de funcionarios e resumo de ferias.
    Sanctum::actingAs($chefe);
    $this->getJson('/api/funcionarios')->assertForbidden();
    $this->getJson('/api/ferias-resumo')->assertForbidden();
});

it('ver presencas da empresa alarga presencas e ocorrencias', function () {
    $empresa = Empresa::factory()->create();
    $chefe = comPermissoes('funcionario', ['ver_presencas_empresa'], $empresa);
    $sem = comPermissoes('estagiario', [], $empresa);
    $outro = User::factory()->create(['empresa_id' => $empresa->id]);
    $dia = '2026-11-20';
    Presenca::create(['user_id' => $outro->id, 'data' => $dia, 'entrada' => '09:00:00']);
    Presenca::create(['user_id' => $sem->id, 'data' => $dia, 'entrada' => '09:00:00']);
    Ocorrencia::create(['user_id' => $outro->id, 'data' => $dia, 'tipo' => 'falta', 'motivo' => 'outro', 'descricao' => 'a']);
    Ocorrencia::create(['user_id' => $sem->id, 'data' => $dia, 'tipo' => 'falta', 'motivo' => 'outro', 'descricao' => 'b']);

    Sanctum::actingAs($chefe);
    $this->getJson('/api/presencas')->assertJsonCount(2, 'data');
    $this->getJson('/api/ocorrencias')->assertJsonCount(2, 'data');

    Sanctum::actingAs($sem);
    $this->getJson('/api/presencas')->assertJsonCount(1, 'data');
    $this->getJson('/api/ocorrencias')->assertJsonCount(1, 'data');
});

it('aprovar contas, limites e definicoes continuam so do admin', function () {
    $chefe = comPermissoes('funcionario', Empresa::chavesPermissoes());
    $alvo = User::factory()->create(['empresa_id' => $chefe->empresa_id]);
    Sanctum::actingAs($chefe);

    $this->postJson("/api/funcionarios/{$alvo->id}/aprovar")->assertForbidden();
    $this->postJson("/api/funcionarios/{$alvo->id}/recusar")->assertForbidden();
    $this->putJson('/api/limites', [])->assertForbidden();
    $this->getJson('/api/definicoes/convite')->assertForbidden();
    $this->getJson('/api/definicoes/permissoes')->assertForbidden();
});
