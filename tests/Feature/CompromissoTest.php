<?php

use App\Models\Compromisso;
use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function doisDaEquipa(): array
{
    $empresa = Empresa::factory()->create();

    return [
        User::factory()->create(['empresa_id' => $empresa->id]),
        User::factory()->create(['empresa_id' => $empresa->id]),
    ];
}

function diaSeguinte(): string
{
    return now('Europe/Lisbon')->addDay()->toDateString();
}

it('exige sessao para os compromissos', function () {
    $this->getJson('/api/compromissos?de=2026-12-01&ate=2026-12-31')->assertStatus(401);
    $this->postJson('/api/compromissos', [])->assertStatus(401);
});

it('marca um compromisso para um dia a seguir', function () {
    [$eu] = doisDaEquipa();
    Sanctum::actingAs($eu);

    $this->postJson('/api/compromissos', [
        'data' => diaSeguinte(),
        'hora_inicio' => '10:00',
        'hora_fim' => '11:30',
        'titulo' => 'Reunião com o cliente',
        'tipo' => 'reuniao',
        'descricao' => 'Sala 2',
    ])->assertCreated()
        ->assertJsonPath('data.titulo', 'Reunião com o cliente')
        ->assertJsonPath('data.hora_inicio', '10:00')
        ->assertJsonPath('data.data', diaSeguinte());

    expect(Compromisso::where('user_id', $eu->id)->count())->toBe(1);
});

it('aceita hoje e compromissos sem hora', function () {
    [$eu] = doisDaEquipa();
    Sanctum::actingAs($eu);

    $this->postJson('/api/compromissos', [
        'data' => now('Europe/Lisbon')->toDateString(),
        'titulo' => 'Entregar relatório',
        'tipo' => 'lembrete',
    ])->assertCreated()->assertJsonPath('data.hora_inicio', null);
});

it('recusa dias passados', function () {
    [$eu] = doisDaEquipa();
    Sanctum::actingAs($eu);

    $this->postJson('/api/compromissos', [
        'data' => now('Europe/Lisbon')->subDay()->toDateString(),
        'titulo' => 'Ontem',
        'tipo' => 'outro',
    ])->assertStatus(422)->assertJsonValidationErrors('data');
});

it('valida horas, título e tipo', function () {
    [$eu] = doisDaEquipa();
    Sanctum::actingAs($eu);

    $this->postJson('/api/compromissos', ['data' => diaSeguinte(), 'titulo' => 'X', 'tipo' => 'reuniao', 'hora_inicio' => '10:00'])
        ->assertStatus(422)->assertJsonValidationErrors('hora_fim');
    $this->postJson('/api/compromissos', ['data' => diaSeguinte(), 'titulo' => 'X', 'tipo' => 'reuniao', 'hora_inicio' => '11:00', 'hora_fim' => '10:00'])
        ->assertStatus(422)->assertJsonValidationErrors('hora_fim');
    $this->postJson('/api/compromissos', ['data' => diaSeguinte(), 'tipo' => 'festa'])
        ->assertStatus(422)->assertJsonValidationErrors(['titulo', 'tipo']);
});

it('lista só os meus compromissos, por dia e hora', function () {
    [$eu, $colega] = doisDaEquipa();
    Compromisso::create(['user_id' => $eu->id, 'data' => '2026-12-02', 'hora_inicio' => '15:00', 'hora_fim' => '16:00', 'titulo' => 'Tarde', 'tipo' => 'reuniao']);
    Compromisso::create(['user_id' => $eu->id, 'data' => '2026-12-02', 'hora_inicio' => '09:00', 'hora_fim' => '10:00', 'titulo' => 'Manhã', 'tipo' => 'chamada']);
    Compromisso::create(['user_id' => $eu->id, 'data' => '2026-12-02', 'titulo' => 'Sem hora', 'tipo' => 'lembrete']);
    Compromisso::create(['user_id' => $eu->id, 'data' => '2027-02-01', 'titulo' => 'Fora do intervalo', 'tipo' => 'outro']);
    Compromisso::create(['user_id' => $colega->id, 'data' => '2026-12-02', 'titulo' => 'Do colega', 'tipo' => 'reuniao']);
    Sanctum::actingAs($eu);

    $res = $this->getJson('/api/compromissos?de=2026-12-01&ate=2026-12-31')->assertOk()->assertJsonCount(3, 'data');
    expect(collect($res->json('data'))->pluck('titulo')->all())->toBe(['Sem hora', 'Manhã', 'Tarde']);
});

it('exige o intervalo ao listar compromissos', function () {
    [$eu] = doisDaEquipa();
    Sanctum::actingAs($eu);

    $this->getJson('/api/compromissos')->assertStatus(422);
});

it('só o dono apaga o compromisso', function () {
    [$eu, $colega] = doisDaEquipa();
    $meu = Compromisso::create(['user_id' => $eu->id, 'data' => '2026-12-02', 'titulo' => 'Meu', 'tipo' => 'outro']);
    $dele = Compromisso::create(['user_id' => $colega->id, 'data' => '2026-12-02', 'titulo' => 'Dele', 'tipo' => 'outro']);
    Sanctum::actingAs($eu);

    $this->deleteJson("/api/compromissos/{$dele->id}")->assertNotFound();
    expect(Compromisso::count())->toBe(2);
    $this->deleteJson("/api/compromissos/{$meu->id}")->assertNoContent();
    expect(Compromisso::count())->toBe(1);
});
