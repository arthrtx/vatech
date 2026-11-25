<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('sem chave paga corrige o texto com o LanguageTool', function () {
    config(['services.anthropic.key' => null]);
    Http::fake(['api.languagetool.org/*' => Http::response(['matches' => [
        ['offset' => 0, 'length' => 4, 'replacements' => [['value' => 'Peço']]],
        ['offset' => 9, 'length' => 6, 'replacements' => [['value' => 'férias']]],
    ]])]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/texto/melhorar', ['texto' => 'peco uns ferias'])
        ->assertOk()
        ->assertJsonPath('texto', 'Peço uns férias.');
});

it('avisa quando o LanguageTool falha', function () {
    config(['services.anthropic.key' => null]);
    Http::fake(['api.languagetool.org/*' => Http::response([], 500)]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/texto/melhorar', ['texto' => 'peco ferias'])->assertStatus(502);
});
