<?php

use App\Models\Presenca;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** Período de um dia de Novembro (Lisboa = UTC); horas "HH:MM". */
function periodo(User $u, string $entrada, ?string $saida, string $dia = '2026-11-23'): Presenca
{
    return Presenca::create([
        'user_id' => $u->id, 'data' => $dia,
        'entrada' => "$dia $entrada:00", 'saida' => $saida ? "$dia $saida:00" : null,
    ])->fresh();
}

it('marca varias entradas e saidas no mesmo dia, cada uma e um periodo', function () {
    $u = User::factory()->create();
    Sanctum::actingAs($u);

    foreach ([1, 2, 3] as $n) {
        $this->postJson('/api/presencas/entrada')->assertCreated();
        $this->getJson('/api/presencas/hoje')->assertOk()->assertJsonPath('data.saida', null);
        $this->postJson('/api/presencas/saida')->assertOk();
        $this->getJson('/api/presencas/hoje')->assertOk()->assertJsonPath('data.saida', fn ($s) => $s !== null);
    }

    expect(Presenca::where('user_id', $u->id)->count())->toBe(3)
        ->and(Presenca::where('user_id', $u->id)->whereNull('saida')->count())->toBe(0);
});

it('entrada com periodo aberto da 422 e saida sem aberto da 422', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/presencas/saida')->assertStatus(422)->assertJsonPath('message', 'Marque primeiro a entrada.');
    $this->postJson('/api/presencas/entrada')->assertCreated();
    $this->postJson('/api/presencas/entrada')->assertStatus(422)->assertJsonPath('message', 'Já tem uma entrada aberta. Marque primeiro a saída.');
    $this->postJson('/api/presencas/saida')->assertOk();
    $this->postJson('/api/presencas/saida')->assertStatus(422)->assertJsonPath('message', 'Marque primeiro a entrada.');
});

it('a saida fecha o periodo aberto, nao um anterior', function () {
    $u = User::factory()->create();
    Sanctum::actingAs($u);
    $this->postJson('/api/presencas/entrada')->assertCreated();
    $this->postJson('/api/presencas/saida')->assertOk();
    $segunda = $this->postJson('/api/presencas/entrada')->assertCreated()->json('data.id');

    $this->postJson('/api/presencas/saida')->assertOk()->assertJsonPath('data.id', $segunda);
    $this->getJson('/api/presencas/hoje')->assertJsonPath('data.id', $segunda);
});

it('cliques repetidos nunca deixam dois periodos abertos', function () {
    $u = User::factory()->create();
    Sanctum::actingAs($u);

    // minimo: a suite corre em SQLite e em série; isto prova a regra, o lock (lockForUpdate na linha da pessoa) só actua em MySQL.
    $respostas = collect(range(1, 4))->map(fn () => $this->postJson('/api/presencas/entrada')->status());

    expect($respostas->all())->toBe([201, 422, 422, 422])
        ->and(Presenca::where('user_id', $u->id)->whereNull('saida')->count())->toBe(1);
});

it('presenca atrasada convive com outros periodos do dia mas nao se sobrepoe', function () {
    $this->travelTo(now()->setDate(2026, 7, 10)->setTime(12, 0)->utc());
    $u = User::factory()->create();
    Sanctum::actingAs($u);
    $post = fn (string $e, string $s) => $this->postJson('/api/presencas/atrasada', ['data' => '2026-07-08', 'entrada' => $e, 'saida' => $s]);

    $post('09:00', '12:00')->assertCreated();
    $post('13:00', '17:00')->assertCreated();
    $post('11:00', '13:30')->assertStatus(422)->assertJsonValidationErrors('entrada');
    $post('08:00', '18:00')->assertStatus(422)->assertJsonValidationErrors('entrada');
    $post('09:30', '10:00')->assertStatus(422)->assertJsonValidationErrors('entrada');
    $post('12:00', '13:00')->assertCreated();
    expect(Presenca::where('user_id', $u->id)->count())->toBe(3);

    // Outra pessoa pode ter o mesmo intervalo.
    Sanctum::actingAs(User::factory()->create());
    $post('09:00', '12:00')->assertCreated();
});

it('um periodo aberto de hoje bloqueia um registo retroactivo que o cruze', function () {
    $this->travelTo(now()->setDate(2026, 7, 10)->setTime(12, 0)->utc());
    $u = User::factory()->create();
    periodo($u, '09:00', null, '2026-07-10'); // 09:00 UTC = 10:00 em Lisboa (verão)
    Sanctum::actingAs($u);

    $this->postJson('/api/presencas/atrasada', ['data' => '2026-07-10', 'entrada' => '09:00', 'saida' => '10:30'])
        ->assertStatus(422)->assertJsonValidationErrors('entrada');
    $this->postJson('/api/presencas/atrasada', ['data' => '2026-07-10', 'entrada' => '08:00', 'saida' => '10:00'])->assertCreated();
});

it('o almoco desconta-se por periodo, so onde cai dentro do horario de almoco', function () {
    $u = User::factory()->create(); // almoço predefinido: 12:00 às 13:00

    $manha = periodo($u, '08:00', '12:00');
    $tarde = periodo($u, '13:00', '17:00');
    $saidaAoAlmoco = periodo($u, '11:00', '12:30', '2026-11-24');
    $volta = periodo($u, '12:45', '17:00', '2026-11-24');
    $atravessa = periodo($u, '08:00', '17:00', '2026-11-25');
    $aberto = periodo($u, '08:00', null, '2026-11-26');

    expect($manha->toContrato()['almoco_min'])->toBe(0)
        ->and($tarde->toContrato()['almoco_min'])->toBe(0)
        ->and($saidaAoAlmoco->toContrato()['almoco_min'])->toBe(30)
        ->and($volta->toContrato()['almoco_min'])->toBe(15)
        ->and($atravessa->toContrato()['almoco_min'])->toBe(60)
        ->and($aberto->toContrato()['almoco_min'])->toBe(0);
});

it('GET /api/presencas ordena por data e entrada e so mostra a empresa de quem pede', function () {
    $admin = User::factory()->admin()->create();
    $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    periodo($u, '13:00', '17:00');
    periodo($u, '08:00', '12:00');
    periodo($u, '09:00', '10:00', '2026-11-24');
    periodo(User::factory()->create(), '09:00', '10:00');

    Sanctum::actingAs($admin);
    $r = $this->getJson('/api/presencas')->assertOk()->assertJsonCount(3, 'data');
    expect(collect($r->json('data'))->map(fn ($p) => substr($p['entrada'], 0, 16))->all())
        ->toBe(['2026-11-24T09:00', '2026-11-23T13:00', '2026-11-23T08:00']);
});

it('GET /api/presencas faz as mesmas queries com varios periodos por pessoa', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $contar = function () {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/presencas')->assertOk();
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $n;
    };
    $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    periodo($u, '08:00', '12:00');
    periodo($u, '13:00', '17:00');
    $com2 = $contar();
    foreach (range(1, 6) as $i) {
        $o = User::factory()->create(['empresa_id' => $admin->empresa_id]);
        periodo($o, '08:00', '12:00');
        periodo($o, '13:00', '17:00');
    }

    expect($contar())->toBe($com2);
});

it('um turno que atravessa a meia-noite fecha-se no dia seguinte', function () {
    $u = User::factory()->create();
    Sanctum::actingAs($u);

    Carbon::setTestNow('2026-11-23 23:00:00');
    $id = $this->postJson('/api/presencas/entrada')->assertCreated()->json('data.id');

    Carbon::setTestNow('2026-11-24 01:30:00');
    $this->getJson('/api/presencas/hoje')->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.saida', null);
    $this->postJson('/api/presencas/saida')->assertOk()->assertJsonPath('data.id', $id);

    $p = Presenca::find($id);
    expect($p->data->format('Y-m-d'))->toBe('2026-11-23')
        ->and($p->saida->format('Y-m-d H:i'))->toBe('2026-11-24 01:30')
        ->and(Presenca::where('user_id', $u->id)->whereNull('saida')->count())->toBe(0);
    Carbon::setTestNow();
});

it('entrada com periodo aberto de ontem da 422', function () {
    $u = User::factory()->create();
    Sanctum::actingAs($u);
    periodo($u, '09:00', null, '2026-11-23');

    Carbon::setTestNow('2026-11-24 09:00:00');
    $this->postJson('/api/presencas/entrada')->assertStatus(422)->assertJsonPath('message', 'Já tem uma entrada aberta. Marque primeiro a saída.');
    Carbon::setTestNow();
});
