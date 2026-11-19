<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('cria utilizadores dos tres tipos e exige papel valido', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    foreach (['admin', 'funcionario', 'estagiario'] as $i => $papel) {
        $this->postJson('/api/funcionarios', ['nome' => "U$i", 'email' => "u$i@x.test", 'password' => 'segredo123', 'papel' => $papel])
            ->assertStatus(201)->assertJsonPath('data.papel', $papel);
    }

    $base = ['nome' => 'Z', 'email' => 'z@x.test', 'password' => 'segredo123'];
    $this->postJson('/api/funcionarios', $base)->assertStatus(422);
    $this->postJson('/api/funcionarios', [...$base, 'papel' => 'chefe'])->assertStatus(422);
});

it('lista todos os tipos da empresa por nome', function () {
    $admin = User::factory()->admin()->create(['nome' => 'Bruno']);
    User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Carla', 'papel' => 'estagiario']);
    User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
    User::factory()->create(['nome' => 'Alheio']);
    Sanctum::actingAs($admin);

    $this->getJson('/api/funcionarios')->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.nome', 'Ana')
        ->assertJsonPath('data.2.papel', 'estagiario');
});

it('edita o papel de outro utilizador, incluindo outro admin, mas 404 para outra empresa', function () {
    $admin = User::factory()->admin()->create();
    $outro = User::factory()->admin()->create(['empresa_id' => $admin->empresa_id, 'email' => 'o@x.test']);
    $alheio = User::factory()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$outro->id}", ['nome' => 'O', 'email' => 'o@x.test', 'papel' => 'estagiario'])
        ->assertOk()->assertJsonPath('data.papel', 'estagiario');
    $this->putJson("/api/funcionarios/{$alheio->id}", ['nome' => 'O', 'email' => 'a@x.test', 'papel' => 'admin'])->assertStatus(404);
    $this->putJson("/api/funcionarios/{$outro->id}", ['nome' => 'O', 'email' => 'o@x.test', 'papel' => 'chefe'])->assertStatus(422);
});

it('impede o admin de apagar ou mudar o papel do proprio utilizador', function () {
    $admin = User::factory()->admin()->create(['email' => 'a@x.test']);
    Sanctum::actingAs($admin);

    $this->putJson("/api/funcionarios/{$admin->id}", ['nome' => 'A', 'email' => 'a@x.test', 'papel' => 'funcionario'])
        ->assertStatus(422)->assertJsonPath('message', 'Não pode alterar o seu próprio tipo de utilizador.');
    $this->putJson("/api/funcionarios/{$admin->id}", ['nome' => 'Novo', 'email' => 'a@x.test', 'papel' => 'admin'])->assertOk();
    $this->deleteJson("/api/funcionarios/{$admin->id}")
        ->assertStatus(422)->assertJsonPath('message', 'Não pode apagar o seu próprio utilizador.');
    expect($admin->refresh()->papel)->toBe('admin')->and($admin->trashed())->toBeFalse();
});
