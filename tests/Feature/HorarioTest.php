<?php

use App\Models\Empresa;
use App\Models\Presenca;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

const HORARIO_PREDEFINIDO = ['entrada' => '08:00', 'saida' => '17:00', 'almoco_inicio' => '12:00', 'almoco_min' => 60];

/** Presença de um dia de Novembro (Lisboa = UTC); horas "HH:MM". */
function presencaHorario(User $u, string $entrada, ?string $saida, string $dia = '2026-11-23'): Presenca
{
    return Presenca::create([
        'user_id' => $u->id, 'data' => $dia,
        'entrada' => "$dia $entrada:00", 'saida' => $saida ? "$dia $saida:00" : null,
    ])->fresh();
}

it('a empresa nasce com 08:00 as 17:00 e 1h de almoco as 12:00, e todos leem o horario', function () {
    $func = User::factory()->create();

    Sanctum::actingAs($func);
    $this->getJson('/api/horario')->assertOk()->assertExactJson(['data' => ['empresa' => HORARIO_PREDEFINIDO, 'meu' => HORARIO_PREDEFINIDO]]);
});

it('so o admin acede as rotas de gestao do horario', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $corpo = ['entrada' => '09:00', 'saida' => '18:00', 'almoco_inicio' => '13:00', 'almoco_min' => 60];

    Sanctum::actingAs($func);
    $this->putJson('/api/definicoes/horario', $corpo)->assertForbidden();
    $this->getJson('/api/definicoes/horarios')->assertForbidden();
    $this->putJson("/api/definicoes/horarios/{$func->id}", $corpo)->assertForbidden();
});

it('admin define o horario da empresa e o meu de quem nao tem horario proprio acompanha', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $novo = ['entrada' => '09:00', 'saida' => '18:00', 'almoco_inicio' => '13:00', 'almoco_min' => 45];

    Sanctum::actingAs($admin);
    $this->putJson('/api/definicoes/horario', $novo)->assertOk()->assertExactJson(['data' => $novo]);

    Sanctum::actingAs($func);
    $this->getJson('/api/horario')->assertOk()->assertExactJson(['data' => ['empresa' => $novo, 'meu' => $novo]]);
});

it('valida o horario da empresa', function () {
    Sanctum::actingAs(User::factory()->admin()->create());
    $ok = ['entrada' => '09:00', 'saida' => '18:00', 'almoco_inicio' => '13:00', 'almoco_min' => 60];

    $this->putJson('/api/definicoes/horario', [])->assertStatus(422)->assertJsonValidationErrors(['entrada', 'saida', 'almoco_inicio', 'almoco_min']);
    $this->putJson('/api/definicoes/horario', [...$ok, 'entrada' => 'xx'])->assertStatus(422)->assertJsonValidationErrors('entrada');
    $this->putJson('/api/definicoes/horario', [...$ok, 'saida' => '09:00'])
        ->assertStatus(422)->assertJsonValidationErrors(['saida' => 'A hora de saída tem de ser depois da entrada.']);
    $this->putJson('/api/definicoes/horario', [...$ok, 'almoco_min' => 241])->assertStatus(422)->assertJsonValidationErrors('almoco_min');
    $this->putJson('/api/definicoes/horario', [...$ok, 'almoco_min' => 'x'])->assertStatus(422)->assertJsonValidationErrors('almoco_min');
    $this->putJson('/api/definicoes/horario', [...$ok, 'almoco_inicio' => '23:30', 'almoco_min' => 60])->assertStatus(422)->assertJsonValidationErrors('almoco_min');
    // O almoço pode ficar fora da jornada e pode ser 0.
    $this->putJson('/api/definicoes/horario', [...$ok, 'almoco_inicio' => '19:00'])->assertOk();
    $this->putJson('/api/definicoes/horario', [...$ok, 'almoco_min' => 0])->assertOk();
});

it('admin personaliza o horario de uma pessoa e volta a segui-la a empresa', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/definicoes/horarios/{$func->id}", ['entrada' => '10:00', 'saida' => null, 'almoco_inicio' => '13:00', 'almoco_min' => 30])
        ->assertOk()->assertExactJson(['data' => [
            'user_id' => $func->id, 'nome' => 'Ana', 'entrada' => '10:00', 'saida' => null, 'almoco_inicio' => '13:00', 'almoco_min' => 30,
            'efectivo' => ['entrada' => '10:00', 'saida' => '17:00', 'almoco_inicio' => '13:00', 'almoco_min' => 30],
        ]]);

    Sanctum::actingAs($func->fresh());
    $this->getJson('/api/horario')->assertOk()
        ->assertJsonPath('data.empresa', HORARIO_PREDEFINIDO)
        ->assertJsonPath('data.meu.entrada', '10:00')
        ->assertJsonPath('data.meu.saida', '17:00');

    Sanctum::actingAs($admin);
    $this->putJson("/api/definicoes/horarios/{$func->id}", ['entrada' => null, 'saida' => null, 'almoco_inicio' => null, 'almoco_min' => null])
        ->assertOk()->assertJsonPath('data.entrada', null)->assertJsonPath('data.efectivo', HORARIO_PREDEFINIDO);
});

it('valida o horario de uma pessoa contra o efectivo', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    $nulos = ['entrada' => null, 'saida' => null, 'almoco_inicio' => null, 'almoco_min' => null];

    // Só a entrada é personalizada: 18:00 passa a saída da empresa (17:00).
    $this->putJson("/api/definicoes/horarios/{$func->id}", [...$nulos, 'entrada' => '18:00'])
        ->assertStatus(422)->assertJsonValidationErrors('saida');
    $this->putJson("/api/definicoes/horarios/{$func->id}", [...$nulos, 'almoco_min' => 500])->assertStatus(422)->assertJsonValidationErrors('almoco_min');
    $this->putJson("/api/definicoes/horarios/{$func->id}", [...$nulos, 'almoco_inicio' => '23:30'])->assertStatus(422)->assertJsonValidationErrors('almoco_min');
    expect($func->fresh()->horario_entrada)->toBeNull();
});

it('pessoa ou horario de outra empresa da 404', function () {
    $admin = User::factory()->admin()->create();
    $outro = User::factory()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/definicoes/horarios/{$outro->id}", ['entrada' => '09:00'])->assertNotFound();
    $this->putJson('/api/definicoes/horarios/999999', [])->assertNotFound();
    $this->getJson('/api/definicoes/horarios')->assertOk()->assertJsonCount(1, 'data');

    // O horário de uma empresa não muda o da outra.
    $this->putJson('/api/definicoes/horario', ['entrada' => '09:00', 'saida' => '18:00', 'almoco_inicio' => '13:00', 'almoco_min' => 30])->assertOk();
    Sanctum::actingAs($outro);
    $this->getJson('/api/horario')->assertOk()->assertJsonPath('data.empresa', HORARIO_PREDEFINIDO);
});

it('a lista de horarios so traz pessoas activas da empresa e faz as mesmas queries com mais pessoas', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $nova = fn (array $a = []) => User::factory()->create(['empresa_id' => $admin->empresa_id, ...$a]);
    $contar = function () {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $r = $this->getJson('/api/definicoes/horarios')->assertOk();
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        return [$n, count($r->json('data'))];
    };
    $nova(['horario_entrada' => '09:00']);
    $nova(['estado_conta' => 'pendente']);
    $nova()->delete();
    [$com2, $total2] = $contar();
    foreach (range(1, 8) as $i) {
        $nova();
    }
    [$com10, $total10] = $contar();

    expect($total2)->toBe(2)->and($total10)->toBe(10)->and($com10)->toBe($com2);
});

it('desconta o almoco por sobreposicao com o horario da empresa', function () {
    $e = User::factory()->create();

    expect(presencaHorario($e, '09:00', '18:00')->toContrato()['almoco_min'])->toBe(60)
        ->and(presencaHorario($e, '09:00', '12:30', '2026-11-24')->toContrato()['almoco_min'])->toBe(30)   // atravessa só metade
        ->and(presencaHorario($e, '12:30', '18:00', '2026-11-25')->toContrato()['almoco_min'])->toBe(30)
        ->and(presencaHorario($e, '08:00', '11:30', '2026-11-26')->toContrato()['almoco_min'])->toBe(0)    // saiu antes
        ->and(presencaHorario($e, '13:30', '18:00', '2026-11-27')->toContrato()['almoco_min'])->toBe(0)    // entrou depois
        ->and(presencaHorario($e, '09:00', null, '2026-11-28')->toContrato()['almoco_min'])->toBe(0);      // sem saída
});

it('almoco de 0 minutos nao desconta', function () {
    $empresa = Empresa::factory()->create();
    $empresa->update(['almoco_minutos' => 0]);
    $e = User::factory()->create(['empresa_id' => $empresa->id]);

    expect(presencaHorario($e, '09:00', '18:00')->toContrato()['almoco_min'])->toBe(0);
});

it('usa o almoco proprio da pessoa e o da empresa quando muda', function () {
    $empresa = Empresa::factory()->create();
    $e = User::factory()->create(['empresa_id' => $empresa->id, 'horario_almoco_inicio' => '13:00', 'almoco_minutos' => 30]);
    $outro = User::factory()->create(['empresa_id' => $empresa->id]);

    expect(presencaHorario($e, '09:00', '18:00')->toContrato()['almoco_min'])->toBe(30)
        ->and(presencaHorario($e, '09:00', '12:50', '2026-11-24')->toContrato()['almoco_min'])->toBe(0)
        ->and(presencaHorario($outro, '09:00', '18:00')->toContrato()['almoco_min'])->toBe(60);

    $empresa->update(['almoco_inicio' => '14:00', 'almoco_minutos' => 90]);
    expect(presencaHorario($outro, '09:00', '18:00', '2026-11-24')->toContrato()['almoco_min'])->toBe(90)
        ->and(presencaHorario($e, '09:00', '18:00', '2026-11-25')->toContrato()['almoco_min'])->toBe(30);
});

it('GET /api/presencas faz as mesmas queries com mais presencas e traz o almoco', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $nova = function (int $dia) use ($admin) {
        $u = User::factory()->create(['empresa_id' => $admin->empresa_id]);
        presencaHorario($u, '09:00', '18:00', "2026-11-$dia");
    };
    $contar = function () {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/presencas')->assertOk()->assertJsonPath('data.0.almoco_min', 60);
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $n;
    };
    $nova(10);
    $nova(11);
    $com2 = $contar();
    foreach (range(12, 20) as $d) {
        $nova($d);
    }

    expect($contar())->toBe($com2);
});

it('a tolerancia de 15 minutos: ate la nao ha atraso, depois conta o atraso todo', function () {
    $u = User::factory()->create();

    expect(presencaHorario($u, '08:15', '12:00', '2026-11-23')->minutosDeAtraso())->toBe(0);
    expect(presencaHorario($u, '08:16', '12:00', '2026-11-24')->minutosDeAtraso())->toBe(16);
    expect(presencaHorario($u, '07:50', '12:00', '2026-11-25')->minutosDeAtraso())->toBe(0);
});

it('a volta do almoco nao conta como atraso', function () {
    $u = User::factory()->create();
    presencaHorario($u, '08:00', '12:00');

    expect(presencaHorario($u, '13:30', '17:00')->minutosDeAtraso())->toBe(0);
});

function presencaEsquecida(User $u, string $dia): Presenca
{
    $p = Presenca::create(['user_id' => $u->id, 'data' => $dia, 'entrada' => "$dia 08:00:00", 'saida' => "$dia 12:00:00", 'atrasada' => true]);
    $p->forceFill(['created_at' => now()])->save();

    return $p->fresh();
}

it('presenca esquecida registada ate 15 min depois da saida do horario nao fica como atrasada', function () {
    $u = User::factory()->create();

    $this->travelTo('2026-11-23 17:10:00');
    expect(presencaEsquecida($u, '2026-11-23')->marcadaForaDeTempo())->toBeFalse();

    $this->travelTo('2026-11-23 17:16:00');
    expect(presencaEsquecida($u, '2026-11-23')->marcadaForaDeTempo())->toBeTrue();

    $this->travelTo('2026-11-25 09:00:00');
    expect(presencaEsquecida($u, '2026-11-23')->marcadaForaDeTempo())->toBeTrue();
});
