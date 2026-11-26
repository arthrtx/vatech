<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cor opcional escolhida ao marcar ferias; o calendario mostra-a a equipa.
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('cor', 16)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('cor');
        });
    }
};
