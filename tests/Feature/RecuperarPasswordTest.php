<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

it('envia o link de recuperacao para o site', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'eu@x.test']);

    $this->postJson('/api/esqueci-password', ['email' => 'eu@x.test'])->assertOk();

    Notification::assertSentTo($user, ResetPassword::class, function ($n) use ($user) {
        $url = (string) $n->toMail($user)->actionUrl;

        return str_starts_with($url, config('app.frontend_url').'/redefinir?token=') && str_contains($url, 'email=eu%40x.test');
    });
});

it('responde igual para um email que nao existe e nao envia nada', function () {
    Notification::fake();

    $this->postJson('/api/esqueci-password', ['email' => 'ninguem@x.test'])
        ->assertOk()
        ->assertJsonPath('message', 'Se o email existir, enviámos um link para definir uma nova palavra-passe.');

    Notification::assertNothingSent();
});

it('define nova palavra-passe com o token e fecha as sessoes abertas', function () {
    $user = User::factory()->create(['email' => 'eu@x.test']);
    $user->createToken('api');
    $token = Password::createToken($user);

    $this->postJson('/api/redefinir-password', [
        'token' => $token, 'email' => 'eu@x.test', 'password' => 'nova-password-1', 'password_confirmation' => 'nova-password-1',
    ])->assertOk();

    expect(Hash::check('nova-password-1', $user->fresh()->password))->toBeTrue();
    expect($user->tokens()->count())->toBe(0);
    $this->postJson('/api/login', ['email' => 'eu@x.test', 'password' => 'nova-password-1'])->assertOk();
});

it('recusa token invalido e o token so serve uma vez', function () {
    $user = User::factory()->create(['email' => 'eu@x.test']);
    $dados = ['email' => 'eu@x.test', 'password' => 'nova-password-1', 'password_confirmation' => 'nova-password-1'];

    $this->postJson('/api/redefinir-password', $dados + ['token' => 'errado'])->assertStatus(422)->assertJsonValidationErrors('token');

    $token = Password::createToken($user);
    $this->postJson('/api/redefinir-password', $dados + ['token' => $token])->assertOk();
    $this->postJson('/api/redefinir-password', $dados + ['token' => $token])->assertStatus(422);
});

it('valida a nova palavra-passe', function () {
    $user = User::factory()->create(['email' => 'eu@x.test']);
    $token = Password::createToken($user);

    $this->postJson('/api/redefinir-password', ['token' => $token, 'email' => 'eu@x.test', 'password' => 'curta', 'password_confirmation' => 'curta'])
        ->assertStatus(422)->assertJsonValidationErrors('password');
    $this->postJson('/api/redefinir-password', ['token' => $token, 'email' => 'eu@x.test', 'password' => 'nova-password-1', 'password_confirmation' => 'outra'])
        ->assertStatus(422)->assertJsonValidationErrors('password');
});
