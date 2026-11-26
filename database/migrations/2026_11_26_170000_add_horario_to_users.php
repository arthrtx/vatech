<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Horário próprio da pessoa; null segue o da empresa, campo a campo.
            $table->time('horario_entrada')->nullable();
            $table->time('horario_saida')->nullable();
            $table->time('horario_almoco_inicio')->nullable();
            $table->unsignedSmallInteger('almoco_minutos')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['horario_entrada', 'horario_saida', 'horario_almoco_inicio', 'almoco_minutos']);
        });
    }
};
