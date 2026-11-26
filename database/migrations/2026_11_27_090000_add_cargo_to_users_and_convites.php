<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cargo', 60)->nullable();
        });
        Schema::table('convites', function (Blueprint $table) {
            $table->string('cargo', 60)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('convites', function (Blueprint $table) {
            $table->dropColumn('cargo');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('cargo');
        });
    }
};
