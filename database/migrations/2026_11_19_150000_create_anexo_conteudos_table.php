<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    /**
     * Os bytes dos anexos passam do disco para a base de dados (o disco do Render apaga-se a cada
     * arranque). Ficam numa tabela à parte para as listas de pedidos nunca os carregarem.
     */
    public function up(): void
    {
        Schema::create('anexo_conteudos', function (Blueprint $table) {
            $table->foreignId('anexo_id')->primary()->constrained('anexos')->cascadeOnDelete();
            $table->binary('conteudo');
        });
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE anexo_conteudos MODIFY conteudo LONGBLOB NOT NULL');
        }

        Schema::table('anexos', function (Blueprint $table) {
            $table->string('caminho')->nullable()->change();
        });

        // Ficheiros que ainda existam no disco passam para a base de dados.
        foreach (DB::table('anexos')->whereNotNull('caminho')->get(['id', 'caminho']) as $a) {
            if (Storage::disk('local')->exists($a->caminho)) {
                DB::table('anexo_conteudos')->insert(['anexo_id' => $a->id, 'conteudo' => Storage::disk('local')->get($a->caminho)]);
                Storage::disk('local')->delete($a->caminho);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('anexo_conteudos');
    }
};
