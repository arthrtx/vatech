<?php

namespace Database\Factories;

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Pedido> */
class PedidoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'empresa_id' => Empresa::factory(),
            'user_id' => fn (array $atributos) => User::factory()->create(['empresa_id' => $atributos['empresa_id']])->id,
            'tipo' => 'ferias',
            'data_inicio' => '2026-12-01',
            'data_fim' => '2026-12-05',
            'estado' => 'pendente',
        ];
    }
}
