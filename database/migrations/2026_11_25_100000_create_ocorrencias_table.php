<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Faltas e atrasos que o estagiário comunica, com o motivo e a descrição.
        Schema::create('ocorrencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('data');
            $table->string('tipo', 10);
            $table->string('motivo', 20);
            $table->text('descricao');
            $table->timestamps();
            $table->index(['user_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ocorrencias');
    }
};
