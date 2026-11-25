<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // Licenças não se aprovam: ficam aprovadas logo e o admin só marca que viu o aviso.
            $table->timestamp('visto_em')->nullable()->after('decidido_em');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('visto_em');
        });
    }
};
