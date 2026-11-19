<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Primeiro arranque em produção: cria a empresa e a conta de admin a partir das variáveis
 * ADMIN_EMAIL e ADMIN_PASSWORD. Não cria as contas de teste do DatabaseSeeder e nunca
 * altera uma conta que já exista, por isso pode correr em todos os arranques.
 */
class ProducaoSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        if (! $email || ! $password) {
            $this->command?->warn('ADMIN_EMAIL/ADMIN_PASSWORD em falta: conta de admin não criada.');

            return;
        }

        $empresa = Empresa::firstOrCreate(['nome' => env('EMPRESA_NOME', 'Setuptech')]);

        User::firstOrCreate(
            ['email' => $email],
            ['empresa_id' => $empresa->id, 'nome' => env('ADMIN_NOME', 'Administrador'), 'papel' => 'admin', 'password' => $password],
        );
    }
}
