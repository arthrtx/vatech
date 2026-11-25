<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Horário de almoço do estagiário (hora de Lisboa), descontado no total de horas de cada dia.
            $table->time('almoco_inicio')->nullable()->after('estagio_fim');
            $table->time('almoco_fim')->nullable()->after('almoco_inicio');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['almoco_inicio', 'almoco_fim']);
        });
    }
};
