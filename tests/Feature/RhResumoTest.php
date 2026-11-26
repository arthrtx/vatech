<?php

use App\Models\Pedido;
use App\Models\Presenca;
use App\Models\RhFicheiro;
use App\Models\RhInfo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('devolve o resumo completo da pessoa', function () {
    $admin = User::factory()->admin()->create();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
    $ano = now()->year;
    // Segunda a sexta de uma semana em Marco (sem feriados): 5 dias uteis.
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'tipo' => 'ferias', 'estado' => 'aprovado', 'data_inicio' => "{$ano}-03-02", 'data_fim' => "{$ano}-03-06", 'observacao' => 'Praia', 'decidido_por' => $admin->id, 'decidido_em' => now()]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'tipo' => 'ausencia', 'estado' => 'recusado', 'data_inicio' => "{$ano}-04-07", 'data_fim' => "{$ano}-04-07", 'motivo_recusa' => 'Sem cobertura']);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => User::factory()->create(['empresa_id' => $admin->empresa_id])->id, 'tipo' => 'ferias']); // de outra pessoa
    RhInfo::create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'titulo' => 'NIF', 'valor' => '123']);
    RhFicheiro::create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'nome' => 'cv.pdf', 'categoria' => 'contrato', 'caminho' => 'rh/segredo/abc', 'mime' => 'application/pdf', 'tamanho' => 99]);
    Presenca::create(['user_id' => $p->id, 'data' => "{$ano}-01-05", 'entrada' => "{$ano}-01-05 09:00:00", 'saida' => "{$ano}-01-05 11:00:00"]);
    Presenca::create(['user_id' => $p->id, 'data' => "{$ano}-01-06", 'entrada' => "{$ano}-01-06 09:00:00", 'saida' => "{$ano}-01-06 10:30:00"]);
    Sanctum::actingAs($admin);

    $r = $this->getJson("/api/rh/fichas/{$p->id}/resumo")->assertOk();
    $d = $r->json('data');

    expect($d['gerado_em'])->toBeString()
        ->and($d['pessoa'])->toHaveKeys(['id', 'nome', 'email', 'papel', 'tipo', 'estagio_inicio', 'estagio_fim', 'instituicao_ensino'])
        ->and($d['pessoa']['id'])->toBe($p->id)
        ->and($d['ferias'])->toBe(['ano' => $ano, 'dias_ano' => 22, 'transitados' => 0, 'usados' => 5, 'restantes' => 17])
        ->and($d['pedidos'])->toHaveCount(2)
        ->and($d['pedidos'][0]['tipo'])->toBe('ausencia')
        ->and($d['pedidos'][0]['tipo_rotulo'])->toBe('Ausência')
        ->and($d['pedidos'][0]['motivo_recusa'])->toBe('Sem cobertura')
        ->and($d['pedidos'][1])->toMatchArray(['tipo' => 'ferias', 'tipo_rotulo' => 'Férias', 'estado' => 'aprovado', 'dias_uteis' => 5, 'motivo' => 'Praia', 'decidido_por' => $admin->nome])
        ->and($d['presencas']['ano'])->toBe($ano)
        ->and($d['presencas']['dias_com_registo'])->toBe(2)
        ->and($d['presencas']['horas_total'])->toBe(3.5)
        ->and($d['infos'])->toHaveCount(1)
        ->and($d['infos'][0]['titulo'])->toBe('NIF')
        ->and($d['ficheiros'])->toHaveCount(1)
        ->and($d['ficheiros'][0])->toBe(['nome' => 'cv.pdf', 'categoria' => 'contrato', 'categoria_nome' => null, 'tamanho' => 99, 'criado_em' => $d['ficheiros'][0]['criado_em']]);
});

it('nao expoe campos internos', function () {
    $admin = User::factory()->admin()->create();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    RhFicheiro::create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'nome' => 'a.pdf', 'caminho' => 'rh/segredo/abc', 'mime' => 'application/pdf', 'tamanho' => 1]);
    Pedido::factory()->create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id]);
    Sanctum::actingAs($admin);

    $corpo = $this->getJson("/api/rh/fichas/{$p->id}/resumo")->assertOk()->getContent();

    expect($corpo)->not->toContain('segredo')->not->toContain('caminho')->not->toContain('password')
        ->not->toContain('remember_token')->not->toContain('"empresa_id":')->not->toContain('criado_por');
});

it('sem gerir_rh: 401 anonimo e 403 funcionario comum', function () {
    $func = User::factory()->create(['papel' => 'funcionario']);
    $this->getJson("/api/rh/fichas/{$func->id}/resumo")->assertUnauthorized();

    Sanctum::actingAs($func);
    $this->getJson("/api/rh/fichas/{$func->id}/resumo")->assertForbidden();
});

it('404 para outra empresa, pessoa nao aprovada ou inexistente', function () {
    $admin = User::factory()->admin()->create();
    $outra = User::factory()->create();
    $pendente = User::factory()->create(['empresa_id' => $admin->empresa_id, 'estado_conta' => 'pendente']);
    Sanctum::actingAs($admin);

    $this->getJson("/api/rh/fichas/{$outra->id}/resumo")->assertNotFound();
    $this->getJson("/api/rh/fichas/{$pendente->id}/resumo")->assertNotFound();
    $this->getJson('/api/rh/fichas/999999/resumo')->assertNotFound();
});

it('nao faz queries por pedido', function () {
    $admin = User::factory()->admin()->create();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Pedido::factory()->count(3)->create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'estado' => 'aprovado', 'decidido_por' => $admin->id]);
    Sanctum::actingAs($admin);

    DB::enableQueryLog();
    $this->getJson("/api/rh/fichas/{$p->id}/resumo")->assertOk()->assertJsonCount(3, 'data.pedidos');
    $com3 = count(DB::getQueryLog());
    Pedido::factory()->count(5)->create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'estado' => 'aprovado', 'decidido_por' => $admin->id]);
    DB::flushQueryLog();
    $this->getJson("/api/rh/fichas/{$p->id}/resumo")->assertOk()->assertJsonCount(8, 'data.pedidos');

    expect(count(DB::getQueryLog()))->toBe($com3);
});
