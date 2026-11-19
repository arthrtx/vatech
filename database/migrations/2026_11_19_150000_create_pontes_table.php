<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pontes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('nome');
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->timestamps();

            $table->index(['empresa_id', 'data_inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pontes');
    }
};
