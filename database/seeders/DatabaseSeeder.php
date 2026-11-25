<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Idempotente: corre a cada arranque do container. Password de dev, nunca em producao. */
    public function run(): void
    {
        $empresa = Empresa::firstOrCreate(['nome' => 'Empresa Demo']);

        User::firstOrCreate(
            ['email' => 'admin@vatech.test'],
            ['empresa_id' => $empresa->id, 'nome' => 'Admin Demo', 'papel' => 'admin', 'email_verified_at' => now(), 'password' => 'password'],
        );
        User::firstOrCreate(
            ['email' => 'funcionario@vatech.test'],
            ['empresa_id' => $empresa->id, 'nome' => 'Funcionario Demo', 'papel' => 'funcionario', 'email_verified_at' => now(), 'password' => 'password'],
        );
    }
}
