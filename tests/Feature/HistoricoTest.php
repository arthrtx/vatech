<?php

use App\Models\Empresa;
use App\Models\RegistoAtividade;
use App\Models\Tipo;
use App\Models\User;
use App\Services\RegistoAtividade as Registo;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function empresaNova(): int
{
    return Empresa::create(['nome' => 'Outra Lda'])->id;
}

it('so o admin acede ao historico', function () {
    $this->getJson('/api/historico')->assertStatus(401);

    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/historico')->assertStatus(403);
    $this->deleteJson('/api/historico')->assertStatus(403);
});

it('lista com o contrato, filtra por tipo e por texto, e pagina', function () {
    $admin = User::factory()->admin()->create(['nome' => 'Ana']);
    $rui = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Rui']);
    Registo::registar('convite', 'Ana convidou x@y.pt como funcionário', $admin);
    Registo::registar('conta', 'Ana aprovou a conta de Rui', $admin, $rui);
    Sanctum::actingAs($admin);

    $r = $this->getJson('/api/historico')->assertOk();
    expect($r->json('meta'))->toBe(['pagina_atual' => 1, 'ultima_pagina' => 1, 'total' => 2]);
    expect($r->json('data.0'))->toHaveKeys(['id', 'tipo', 'descricao', 'actor', 'alvo', 'criado_em']);
    expect($r->json('data.0.tipo'))->toBe('conta');
    expect($r->json('data.0.alvo'))->toBe(['id' => $rui->id, 'nome' => 'Rui']);
    expect($r->json('data.1.alvo'))->toBeNull();

    expect($this->getJson('/api/historico?tipo=convite')->json('data'))->toHaveCount(1);
    expect($this->getJson('/api/historico?q=Rui')->json('data'))->toHaveCount(1);
    $this->getJson('/api/historico?tipo=nada')->assertStatus(422);

    foreach (range(1, 30) as $i) {
        Registo::registar('sessao', "Ana iniciou sessão {$i}", $admin);
    }
    $p2 = $this->getJson('/api/historico?pagina=2')->assertOk();
    expect($p2->json('meta'))->toBe(['pagina_atual' => 2, 'ultima_pagina' => 2, 'total' => 32]);
    expect($p2->json('data'))->toHaveCount(7);
});

it('o escopo e sempre a empresa do admin', function () {
    $admin = User::factory()->admin()->create();
    $outra = User::factory()->admin()->create(['empresa_id' => empresaNova()]);
    Registo::registar('sessao', 'Outra iniciou sessão', $outra);
    Registo::registar('sessao', 'Ana iniciou sessão', $admin);

    Sanctum::actingAs($admin);
    $d = $this->getJson('/api/historico')->json('data');
    expect($d)->toHaveCount(1)->and($d[0]['descricao'])->toBe('Ana iniciou sessão');
});

it('um convite gera registo com o email e sem dados sensiveis', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create(['nome' => 'Ana']);
    Sanctum::actingAs($admin);

    $this->postJson('/api/funcionarios/convites', ['nome' => 'Rui', 'email' => 'rui@x.pt', 'papel' => 'funcionario'])->assertCreated();

    $reg = RegistoAtividade::firstOrFail();
    expect($reg->tipo)->toBe('convite')
        ->and($reg->descricao)->toBe('Ana convidou rui@x.pt como funcionário')
        ->and($reg->user_id)->toBe($admin->id);
    expect($reg->descricao)->not->toContain('token');
});

it('um pedido e a sua decisao geram registo sem motivos nem observacoes', function () {
    $empresaId = User::factory()->admin()->create()->empresa_id;
    $admin = User::where('empresa_id', $empresaId)->first();
    $admin->update(['nome' => 'Admin']);
    $rui = User::factory()->create(['empresa_id' => $empresaId, 'nome' => 'Rui']);

    Sanctum::actingAs($rui);
    $id = $this->postJson('/api/pedidos', [
        'tipo' => 'ferias', 'data_inicio' => '2027-03-01', 'data_fim' => '2027-03-05', 'observacao' => 'SEGREDO-OBS',
    ])->assertCreated()->json('data.id');

    Sanctum::actingAs($admin);
    $this->postJson("/api/pedidos/{$id}/recusar", ['motivo_recusa' => 'SEGREDO-MOTIVO'])->assertOk();

    $descricoes = RegistoAtividade::orderBy('id')->pluck('descricao')->all();
    expect($descricoes)->toBe([
        'Rui pediu férias: 01/03 a 05/03',
        'Admin recusou o pedido de férias de Rui',
    ]);
    expect(implode(' ', $descricoes))->not->toContain('SEGREDO');
});

it('definir o estagio nao grava a instituicao de ensino', function () {
    $admin = User::factory()->admin()->create();
    $est = User::factory()->create(['empresa_id' => $admin->empresa_id, 'papel' => 'estagiario']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$est->id}/estagio", [
        'estagio_inicio' => '2027-01-01', 'estagio_fim' => '2027-06-30', 'instituicao_ensino' => 'Escola Secreta',
    ])->assertOk();

    $reg = RegistoAtividade::firstOrFail();
    expect($reg->tipo)->toBe('estagio')->and($reg->descricao)->not->toContain('Escola');
});

it('o registo nunca parte o pedido e trunca a 255', function () {
    $user = User::factory()->create();
    Registo::registar('tipo-invalido', 'x', $user);
    Registo::registar('sessao', str_repeat('a', 400), $user);

    expect(RegistoAtividade::count())->toBe(1)
        ->and(strlen(RegistoAtividade::first()->descricao))->toBe(255);
});

it('DELETE apaga so a empresa do admin e deixa uma linha de rasto', function () {
    $admin = User::factory()->admin()->create(['nome' => 'Ana']);
    $outra = User::factory()->admin()->create(['empresa_id' => empresaNova()]);
    Registo::registar('sessao', 'a', $admin);
    Registo::registar('sessao', 'b', $admin);
    Registo::registar('sessao', 'c', $outra);

    Sanctum::actingAs($admin);
    $this->deleteJson('/api/historico')->assertOk()->assertExactJson(['data' => ['apagados' => 2]]);

    $minha = RegistoAtividade::where('empresa_id', $admin->empresa_id)->get();
    expect($minha)->toHaveCount(1)
        ->and($minha[0]->tipo)->toBe('definicoes')
        ->and($minha[0]->descricao)->toBe('Ana apagou o histórico (2 registos)');
    expect(RegistoAtividade::where('empresa_id', $outra->empresa_id)->count())->toBe(1);
});

it('historico:limpar apaga o antigo, mantem o recente e nao toca noutras tabelas', function () {
    $admin = User::factory()->admin()->create();
    Registo::registar('sessao', 'antigo', $admin);
    Registo::registar('sessao', 'recente', $admin);
    RegistoAtividade::where('descricao', 'antigo')->update(['created_at' => now()->subMonths(6)->subDay()]);
    RegistoAtividade::where('descricao', 'recente')->update(['created_at' => now()->subMonths(5)]);
    $users = User::count();
    $pedidos = DB::table('pedidos')->count();

    $this->artisan('historico:limpar')->expectsOutputToContain('1 linhas apagadas')->assertExitCode(0);

    expect(RegistoAtividade::pluck('descricao')->all())->toBe(['recente']);
    expect(User::count())->toBe($users)->and(DB::table('pedidos')->count())->toBe($pedidos);
});

it('a retencao vem de config e o comando esta agendado', function () {
    $admin = User::factory()->admin()->create();
    Registo::registar('sessao', 'x', $admin);
    RegistoAtividade::query()->update(['created_at' => now()->subMonths(2)]);

    config(['historico.retencao_meses' => 1]);
    Artisan::call('historico:limpar');
    expect(RegistoAtividade::count())->toBe(0);

    $agendados = collect(app(Schedule::class)->events())->pluck('command')->implode(' ');
    expect($agendados)->toContain('historico:limpar');
});

it('mudar o papel e o tipo de uma pessoa regista uma unica linha clara', function () {
    $admin = User::factory()->admin()->create(['nome' => 'Ana']);
    $rui = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Rui', 'papel' => 'funcionario']);
    $tipo = Tipo::create(['empresa_id' => $admin->empresa_id, 'nome' => 'Estagiário RH', 'base' => 'estagiario', 'permissoes' => []]);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$rui->id}/tipo", ['tipo_id' => $tipo->id])->assertOk();
    $linhas = RegistoAtividade::where('tipo', 'conta')->get();
    expect($linhas)->toHaveCount(1);
    expect($linhas[0]->descricao)->toBe('Ana alterou Rui: o papel passou a estagiário e o tipo passou a Estagiário RH');

    // Voltar a funcionário sem tipo: ainda uma só linha nova, sem a expressão "sem tipo" solta.
    $this->putJson("/api/funcionarios/{$rui->id}/tipo", ['tipo_id' => null, 'papel' => 'funcionario'])->assertOk();
    expect(RegistoAtividade::where('tipo', 'conta')->count())->toBe(2);
    expect(RegistoAtividade::where('tipo', 'conta')->latest('id')->first()->descricao)
        ->toBe('Ana alterou Rui: o papel passou a funcionário e ficou sem tipo');

    // Sem alteração real: nada a registar.
    $this->putJson("/api/funcionarios/{$rui->id}/tipo", ['tipo_id' => null])->assertOk();
    expect(RegistoAtividade::where('tipo', 'conta')->count())->toBe(2);
});
