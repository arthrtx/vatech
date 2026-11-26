<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rh_ficheiros', function (Blueprint $table) {
            $table->string('categoria', 30)->default('outro')->after('nome');
            $table->string('categoria_nome', 60)->nullable()->after('categoria');
        });
    }

    public function down(): void
    {
        Schema::table('rh_ficheiros', function (Blueprint $table) {
            $table->dropColumn(['categoria', 'categoria_nome']);
        });
    }
};
