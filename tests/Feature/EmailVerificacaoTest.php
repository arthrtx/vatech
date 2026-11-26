<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function linkVerificacao(User $user, ?Carbon $expira = null): string
{
    return URL::temporarySignedRoute('verification.verify', $expira ?? now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
}

it('bloqueia o login por verificar e nao emite token', function () {
    User::factory()->unverified()->create(['email' => 'ana@x.test']);

    $this->postJson('/api/login', ['email' => 'ana@x.test', 'password' => 'password'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email')
        ->assertJsonMissingPath('token');
});

it('verifica o email pelo link assinado e redirecciona para o login', function () {
    $user = User::factory()->unverified()->create();

    $this->get(linkVerificacao($user))->assertRedirect(config('app.frontend_url').'/login?verificado=1');

    expect($user->refresh()->hasVerifiedEmail())->toBeTrue();
    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
});

it('rejeita link invalido, adulterado ou expirado', function () {
    $user = User::factory()->unverified()->create();
    $falha = config('app.frontend_url').'/login?verificado=0';

    $this->get("/api/email/verificar/{$user->id}/".sha1($user->email))->assertRedirect($falha); // sem assinatura
    $this->get(str_replace(sha1($user->email), sha1('outro@x.test'), linkVerificacao($user)))->assertRedirect($falha); // hash adulterado
    $this->get(linkVerificacao($user, now()->subMinute()))->assertRedirect($falha); // expirado
    $this->get(URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => 99999, 'hash' => 'x']))->assertRedirect($falha); // inexistente

    expect($user->refresh()->hasVerifiedEmail())->toBeFalse();
});

it('reenvia a verificacao com resposta igual exista ou nao a conta', function () {
    Notification::fake();
    $por = User::factory()->unverified()->create(['email' => 'por@x.test']);
    $ja = User::factory()->create(['email' => 'ja@x.test']);

    $a = $this->postJson('/api/email/reenviar', ['email' => 'por@x.test'])->assertOk()->json();
    $b = $this->postJson('/api/email/reenviar', ['email' => 'ja@x.test'])->assertOk()->json();
    $c = $this->postJson('/api/email/reenviar', ['email' => 'ninguem@x.test'])->assertOk()->json();

    expect($a)->toBe($b)->toBe($c);
    Notification::assertSentTo($por, VerifyEmail::class);
    Notification::assertNotSentTo($ja, VerifyEmail::class);
    Notification::assertCount(1);
});

it('ja nao ha rotas para o admin criar ou editar funcionarios', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson('/api/funcionarios', ['nome' => 'X'])->assertStatus(405);
    $this->putJson("/api/funcionarios/{$func->id}", [])->assertStatus(405);
    $this->getJson('/api/funcionarios')->assertOk();
});
