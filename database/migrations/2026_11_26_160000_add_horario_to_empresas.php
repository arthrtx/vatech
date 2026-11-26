<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            // Horário de funcionamento da empresa (hora de Lisboa) e almoço (início + duração), definidos pelo admin.
            $table->time('horario_entrada')->default('08:00');
            $table->time('horario_saida')->default('17:00');
            $table->time('almoco_inicio')->default('12:00');
            $table->unsignedSmallInteger('almoco_minutos')->default(60);
        });
    }

    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn(['horario_entrada', 'horario_saida', 'almoco_inicio', 'almoco_minutos']);
        });
    }
};
