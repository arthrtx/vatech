<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presencas', function (Blueprint $table) {
            // Cada linha passa a ser um período (entrada, saída); o índice novo vem antes de largar a
            // unique porque, em MySQL, é ela que serve a FK de user_id (largá-la sozinha dá ERROR 1553).
            $table->index(['user_id', 'data']);
            $table->dropUnique(['user_id', 'data']);
        });
    }

    public function down(): void
    {
        // Só volta à regra "um por dia" se ela ainda for verdadeira; apagar períodos seria perder dados.
        $duplicados = DB::table('presencas')->select('user_id', 'data')->groupBy('user_id', 'data')->havingRaw('count(*) > 1')->count();
        if ($duplicados > 0) {
            throw new RuntimeException("Não é possível repor a unique (user_id, data): há $duplicados dia(s) com mais de um período em presencas. Junte ou apague os períodos a mais primeiro.");
        }

        Schema::table('presencas', function (Blueprint $table) {
            $table->unique(['user_id', 'data']);
            $table->dropIndex(['user_id', 'data']);
        });
    }
};
