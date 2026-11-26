<?php

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function corpoEstagio(array $o = []): array
{
    return ['estagio_inicio' => '2026-09-01', 'estagio_fim' => '2027-02-28', 'instituicao_ensino' => 'ISEP', ...$o];
}

function adminEEstagiario(): array
{
    $empresa = Empresa::factory()->create();
    $admin = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'admin']);
    $est = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'estagiario']);

    return [$admin, $est];
}

it('admin define periodo e instituicao e a resposta traz-os', function () {
    [$admin, $est] = adminEEstagiario();
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$est->id}/estagio", corpoEstagio())->assertOk()
        ->assertJsonPath('data.estagio_inicio', '2026-09-01')
        ->assertJsonPath('data.estagio_fim', '2027-02-28')
        ->assertJsonPath('data.instituicao_ensino', 'ISEP');

    $this->putJson("/api/funcionarios/{$est->id}/estagio", ['estagio_inicio' => null, 'estagio_fim' => null, 'instituicao_ensino' => ''])->assertOk()
        ->assertJsonPath('data.estagio_inicio', null)
        ->assertJsonPath('data.instituicao_ensino', null);
});

it('so o admin edita e o estagiario ve a sua instituicao em /me', function () {
    [$admin, $est] = adminEEstagiario();
    $est->forceFill(['instituicao_ensino' => 'ISEP'])->save();
    Sanctum::actingAs($est);

    $this->putJson("/api/funcionarios/{$est->id}/estagio", corpoEstagio())->assertForbidden();
    $this->getJson('/api/me')->assertJsonPath('user.instituicao_ensino', 'ISEP');
    $this->putJson('/api/me', ['nome' => 'E', 'email' => $est->email, 'instituicao_ensino' => 'X'])->assertOk();
    expect($est->fresh()->instituicao_ensino)->toBe('ISEP');
});

it('outra empresa da 404, outro papel 422 e fim anterior ao inicio 422', function () {
    [$admin, $est] = adminEEstagiario();
    $outra = User::factory()->create(['empresa_id' => Empresa::factory()->create()->id, 'papel' => 'estagiario']);
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id, 'papel' => 'funcionario']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$outra->id}/estagio", corpoEstagio())->assertNotFound();
    $this->putJson("/api/funcionarios/{$func->id}/estagio", corpoEstagio())->assertStatus(422)
        ->assertJsonPath('errors.papel.0', 'Só estagiários têm período de estágio.');
    $this->putJson("/api/funcionarios/{$est->id}/estagio", corpoEstagio(['estagio_fim' => '2026-08-01']))
        ->assertStatus(422)->assertJsonValidationErrors('estagio_fim');
    $this->putJson("/api/funcionarios/{$est->id}/estagio", corpoEstagio(['instituicao_ensino' => str_repeat('a', 151)]))
        ->assertStatus(422)->assertJsonValidationErrors('instituicao_ensino');
});

it('estagios devolve so os que se sobrepoem, sem instituicao e sem outras empresas', function () {
    [$admin, $a] = adminEEstagiario();
    $e = $admin->empresa_id;
    $a->forceFill(['nome' => 'Zé', 'estagio_inicio' => '2026-09-01', 'estagio_fim' => '2026-12-31', 'instituicao_ensino' => 'ISEP'])->save();
    User::factory()->create(['empresa_id' => $e, 'papel' => 'estagiario', 'nome' => 'Ana', 'estagio_inicio' => null, 'estagio_fim' => '2026-10-15']);
    User::factory()->create(['empresa_id' => $e, 'papel' => 'estagiario', 'nome' => 'Rui', 'estagio_inicio' => '2026-11-01', 'estagio_fim' => null]);
    User::factory()->create(['empresa_id' => $e, 'papel' => 'estagiario', 'nome' => 'Sem datas']);
    User::factory()->create(['empresa_id' => $e, 'papel' => 'estagiario', 'nome' => 'Fora', 'estagio_inicio' => '2025-01-01', 'estagio_fim' => '2025-06-01']);
    User::factory()->create(['empresa_id' => $e, 'papel' => 'funcionario', 'nome' => 'Func', 'estagio_inicio' => '2026-09-01']);
    User::factory()->create(['empresa_id' => Empresa::factory()->create()->id, 'papel' => 'estagiario', 'nome' => 'Alheio', 'estagio_inicio' => '2026-09-01']);

    $colega = User::factory()->create(['empresa_id' => $e, 'papel' => 'funcionario']);
    Sanctum::actingAs($colega);

    $res = $this->getJson('/api/estagios?de=2026-10-01&ate=2026-10-31')->assertOk();
    expect(collect($res->json('data'))->pluck('user.nome')->all())->toBe(['Ana', 'Zé']);
    expect($res->json('data.1'))->toBe(['user' => ['id' => $a->id, 'nome' => 'Zé'], 'inicio' => '2026-09-01', 'fim' => '2026-12-31']);
    expect($res->json('data.0.inicio'))->toBeNull();
    expect($res->getContent())->not->toContain('ISEP')->not->toContain('instituicao');

    $res = $this->getJson('/api/estagios?de=2027-01-01&ate=2027-01-31')->assertOk();
    expect(collect($res->json('data'))->pluck('user.nome')->all())->toBe(['Rui']);

    $this->getJson('/api/estagios?de=2026-10-31&ate=2026-10-01')->assertStatus(422);
});

it('estagios exige autenticacao', function () {
    $this->getJson('/api/estagios?de=2026-10-01&ate=2026-10-31')->assertUnauthorized();
});
