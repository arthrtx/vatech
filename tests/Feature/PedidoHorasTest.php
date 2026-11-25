<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function diaFuturo(): string
{
    return now('Europe/Lisbon')->addDays(10)->toDateString();
}

it('a ausencia guarda as horas', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', [
        'tipo' => 'ausencia', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo(),
        'hora_inicio' => '10:00', 'hora_fim' => '12:30',
    ])->assertCreated()
        ->assertJsonPath('data.hora_inicio', '10:00')
        ->assertJsonPath('data.hora_fim', '12:30');
});

it('sem horas o pedido fica como antes', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ausencia', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo()])
        ->assertCreated()
        ->assertJsonPath('data.hora_inicio', null);
});

it('recusa horas em ferias e licencas', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/pedidos', ['tipo' => 'ferias', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo(), 'hora_inicio' => '10:00', 'hora_fim' => '11:00'])
        ->assertStatus(422)->assertJsonValidationErrors(['hora_inicio', 'hora_fim']);
    $this->postJson('/api/pedidos', ['tipo' => 'licenca', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo(), 'hora_inicio' => '10:00', 'hora_fim' => '11:00'])
        ->assertStatus(422)->assertJsonValidationErrors(['hora_inicio', 'hora_fim']);
});

it('valida a ordem das horas e o fim obrigatorio', function () {
    Sanctum::actingAs(User::factory()->create());
    $base = ['tipo' => 'ausencia', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo()];

    $this->postJson('/api/pedidos', [...$base, 'hora_inicio' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('hora_fim');
    $this->postJson('/api/pedidos', [...$base, 'hora_inicio' => '12:00', 'hora_fim' => '10:00'])->assertStatus(422)->assertJsonValidationErrors('hora_fim');
});

it('editar sem horas limpa as que existiam', function () {
    Sanctum::actingAs(User::factory()->create());
    $corpo = ['tipo' => 'ausencia', 'data_inicio' => diaFuturo(), 'data_fim' => diaFuturo()];
    $id = $this->postJson('/api/pedidos', [...$corpo, 'hora_inicio' => '10:00', 'hora_fim' => '11:00'])->assertCreated()->json('data.id');

    $this->putJson("/api/pedidos/{$id}", $corpo)->assertOk()->assertJsonPath('data.hora_inicio', null)->assertJsonPath('data.hora_fim', null);
});
