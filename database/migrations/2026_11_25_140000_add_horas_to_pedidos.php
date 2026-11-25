<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Só as ausências (de um dia) levam horas: ex. uma consulta das 10:00 às 12:00.
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('hora_inicio', 5)->nullable();
            $table->string('hora_fim', 5)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['hora_inicio', 'hora_fim']);
        });
    }
};
