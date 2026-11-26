<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained()->cascadeOnDelete();
            $table->string('nome');
            $table->string('email');
            $table->string('papel')->default('funcionario');
            $table->string('token', 64)->unique();
            $table->foreignId('convidado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expira_em');
            $table->timestamp('usado_em')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'email']);
        });

        // Contas existentes ficam aprovadas (default).
        Schema::table('users', function (Blueprint $table) {
            $table->string('estado_conta')->default('aprovado');
            $table->timestamp('aprovado_em')->nullable();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['aprovado_por']);
            $table->dropColumn(['estado_conta', 'aprovado_em', 'aprovado_por']);
        });

        Schema::dropIfExists('convites');
    }
};
