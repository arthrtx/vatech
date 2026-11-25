<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Compromissos da agenda pessoal (reuniões, chamadas, lembretes...), privados de quem os marca.
        Schema::create('compromissos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('data');
            $table->string('hora_inicio', 5)->nullable();
            $table->string('hora_fim', 5)->nullable();
            $table->string('titulo', 120);
            $table->string('tipo', 20);
            $table->text('descricao')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compromissos');
    }
};
