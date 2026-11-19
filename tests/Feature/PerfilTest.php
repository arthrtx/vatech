<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('admin e funcionario editam o proprio nome e email', function (User $user) {
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'Novo Nome', 'email' => 'novo@x.test'])
        ->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.nome', 'Novo Nome')
        ->assertJsonPath('user.email', 'novo@x.test');

    expect($user->fresh())->nome->toBe('Novo Nome')->email->toBe('novo@x.test');
})->with([
    'admin' => fn () => User::factory()->admin()->create(),
    'funcionario' => fn () => User::factory()->create(),
]);

it('aceita manter o proprio email', function () {
    $user = User::factory()->create(['email' => 'eu@x.test']);
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'Outro', 'email' => 'eu@x.test'])->assertOk();
});

it('rejeita email duplicado com 422', function () {
    User::factory()->create(['email' => 'ocupado@x.test']);
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'ocupado@x.test'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

it('rejeita password sem password_atual', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password' => 'novasenha1'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password_atual');
});

it('rejeita password_atual errada', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password' => 'novasenha1', 'password_atual' => 'errada'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password_atual');
});

it('rejeita password curta', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password' => 'curta', 'password_atual' => 'password'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

it('muda a password, mantem o token e permite novo login', function () {
    $user = User::factory()->create(['email' => 'p@x.test']);
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)
        ->putJson('/api/me', ['nome' => 'P', 'email' => 'p@x.test', 'password' => 'novasenha1', 'password_atual' => 'password'])
        ->assertOk();

    $this->withToken($token)->getJson('/api/me')->assertOk();
    $this->postJson('/api/login', ['email' => 'p@x.test', 'password' => 'novasenha1'])->assertOk();
    $this->postJson('/api/login', ['email' => 'p@x.test', 'password' => 'password'])->assertStatus(422);
});

it('devolve 401 sem token', function () {
    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test'])->assertStatus(401);
});

it('ignora papel e empresa_id', function () {
    $user = User::factory()->create();
    $papel = $user->papel;
    $empresa = $user->empresa_id;
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'papel' => 'admin', 'empresa_id' => 999])
        ->assertOk()
        ->assertJsonPath('user.papel', $papel)
        ->assertJsonPath('user.empresa_id', $empresa);

    expect($user->fresh())->papel->toBe($papel)->empresa_id->toBe($empresa);
});
