<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained()->cascadeOnDelete();
            $table->string('nome', 40);
            $table->string('base'); // funcionario | estagiario
            $table->json('permissoes')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'nome']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tipo_id')->nullable()->constrained('tipos')->restrictOnDelete();
        });

        Schema::table('convites', function (Blueprint $table) {
            $table->foreignId('tipo_id')->nullable()->constrained('tipos')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('convites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tipo_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tipo_id');
        });
        Schema::dropIfExists('tipos');
    }
};
