<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

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
