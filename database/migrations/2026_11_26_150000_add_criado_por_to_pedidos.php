<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Quem criou o pedido quando o fez em nome de outra pessoa (D14); pedidos antigos ficam null.
        Schema::table('pedidos', function (Blueprint $table) {
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropForeign(['criado_por']);
            $table->dropColumn('criado_por');
        });
    }
};
