<?php

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\RegistoAtividade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function comPermissoesApagar(Empresa $empresa, array $ligadas): User
{
    $todas = array_fill_keys(Empresa::chavesPermissoes(), false);
    $empresa->update(['permissoes' => ['funcionario' => [...$todas, ...array_fill_keys($ligadas, true)]]]);

    return User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
}

function pedidoApagar(User $u, string $estado = 'aprovado'): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $u->empresa_id, 'user_id' => $u->id, 'tipo' => 'ferias', 'estado' => $estado, 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-02']);
}

it('apagar_pedidos e apagar_pessoas estao no catalogo, em gestao, fora das predefinicoes', function () {
    foreach (['apagar_pedidos', 'apagar_pessoas'] as $chave) {
        $linha = collect(Empresa::PERMISSOES_CATALOGO)->firstWhere(0, $chave);
        expect($linha[2])->toBe('gestao');
        expect(Empresa::permissoesPredefinidas('funcionario')[$chave])->toBeFalse();
    }
});

it('o admin apaga um pedido de outra pessoa em qualquer estado e fica no historico', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'admin']);
    $rui = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    $p = pedidoApagar($rui, 'aprovado');

    Sanctum::actingAs($admin);
    $this->deleteJson("/api/pedidos/{$p->id}")->assertNoContent();

    expect(Pedido::find($p->id))->toBeNull();
    expect(RegistoAtividade::where('tipo', 'pedido')->where('alvo_user_id', $rui->id)->exists())->toBeTrue();
});

it('sem apagar_pedidos um funcionario continua sem apagar pedidos de outros ou ja decididos', function () {
    $empresa = Empresa::factory()->create();
    $eu = comPermissoesApagar($empresa, ['pedir_ferias']);
    $outro = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    $deOutro = pedidoApagar($outro, 'pendente');
    $meuAprovado = pedidoApagar($eu, 'aprovado');

    Sanctum::actingAs($eu);
    $this->deleteJson("/api/pedidos/{$deOutro->id}")->assertNotFound();
    $this->deleteJson("/api/pedidos/{$meuAprovado->id}")->assertStatus(409);
    expect(Pedido::count())->toBe(2);
});

it('quem tem apagar_pedidos apaga os da equipa mas nao os de outra empresa', function () {
    $empresa = Empresa::factory()->create();
    $gestor = comPermissoesApagar($empresa, ['apagar_pedidos']);
    $rui = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    $estranho = User::factory()->create(['empresa_id' => Empresa::factory()->create()->id, 'papel' => 'funcionario']);
    $meu = pedidoApagar($rui);
    $fora = pedidoApagar($estranho);

    Sanctum::actingAs($gestor);
    $this->deleteJson("/api/pedidos/{$fora->id}")->assertNotFound();
    $this->deleteJson("/api/pedidos/{$meu->id}")->assertNoContent();
    expect(Pedido::find($fora->id))->not->toBeNull();
});

it('o admin apaga um funcionario e tudo o que e dele', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'admin']);
    $rui = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    $p = pedidoApagar($rui);

    Sanctum::actingAs($admin);
    $this->deleteJson("/api/funcionarios/{$rui->id}")->assertNoContent();

    expect(User::find($rui->id))->toBeNull()->and(User::withTrashed()->find($rui->id))->not->toBeNull();
    expect($rui->tokens()->count())->toBe(0);
    expect(RegistoAtividade::where('tipo', 'conta')->where('descricao', 'like', '%apagou a conta de '.$rui->nome.'%')->exists())->toBeTrue();
});

it('nao se apaga a propria conta, um admin, nem pessoas de outra empresa', function () {
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'admin']);
    $outroAdmin = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'admin']);
    $estranho = User::factory()->create(['empresa_id' => Empresa::factory()->create()->id, 'papel' => 'funcionario']);

    Sanctum::actingAs($admin);
    $this->deleteJson("/api/funcionarios/{$admin->id}")->assertStatus(422);
    $this->deleteJson("/api/funcionarios/{$outroAdmin->id}")->assertStatus(422);
    $this->deleteJson("/api/funcionarios/{$estranho->id}")->assertNotFound();
    expect(User::count())->toBe(3);
});

it('apagar pessoas e delegavel mas sem a permissao da 403', function () {
    $empresa = Empresa::factory()->create();
    $semPerm = comPermissoesApagar($empresa, ['pedir_ferias']);
    $rui = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);

    Sanctum::actingAs($semPerm);
    $this->deleteJson("/api/funcionarios/{$rui->id}")->assertForbidden();

    $gestor = comPermissoesApagar($empresa, ['apagar_pessoas']);
    Sanctum::actingAs($gestor);
    $this->deleteJson("/api/funcionarios/{$rui->id}")->assertNoContent();
    expect(User::find($rui->id))->toBeNull();
});
