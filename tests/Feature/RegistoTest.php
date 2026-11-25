<?php

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function dadosRegisto(array $extra = []): array
{
    return ['nome' => 'Ana', 'email' => 'ana@x.test', 'password' => 'segredo123', 'password_confirmation' => 'segredo123', 'aceita_termos' => true, ...$extra];
}

function linkVerificacao(User $user, ?Carbon $expira = null): string
{
    return URL::temporarySignedRoute('verification.verify', $expira ?? now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
}

it('regista um funcionario na empresa unica e envia o email de verificacao', function () {
    Notification::fake();
    $empresa = Empresa::factory()->create();

    $this->postJson('/api/registo', dadosRegisto())
        ->assertStatus(201)
        ->assertJsonStructure(['message'])
        ->assertJsonMissingPath('token');

    $user = User::where('email', 'ana@x.test')->firstOrFail();
    expect($user->papel)->toBe('funcionario')
        ->and($user->empresa_id)->toBe($empresa->id)
        ->and($user->termos_aceites_em)->not->toBeNull()
        ->and($user->email_verified_at)->toBeNull();
    Notification::assertSentTo($user, VerifyEmail::class);
});

it('falha o registo sem aceitar os termos', function () {
    Empresa::factory()->create();

    $this->postJson('/api/registo', dadosRegisto(['aceita_termos' => false]))
        ->assertStatus(422)->assertJsonValidationErrors('aceita_termos');
    $this->postJson('/api/registo', collect(dadosRegisto())->except('aceita_termos')->all())
        ->assertStatus(422)->assertJsonValidationErrors('aceita_termos');
    expect(User::count())->toBe(0);
});

it('falha o registo com email duplicado ou password sem confirmacao', function () {
    $empresa = Empresa::factory()->create();
    User::factory()->create(['empresa_id' => $empresa->id, 'email' => 'ana@x.test']);

    $this->postJson('/api/registo', dadosRegisto())->assertStatus(422)->assertJsonValidationErrors('email');
    $this->postJson('/api/registo', dadosRegisto(['email' => 'b@x.test', 'password_confirmation' => 'outra']))
        ->assertStatus(422)->assertJsonValidationErrors('password');
});

it('devolve 503 no registo quando nao existe empresa', function () {
    $this->postJson('/api/registo', dadosRegisto())->assertStatus(503)->assertJsonStructure(['message']);
});

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

it('ja nao ha rotas para o admin criar, editar ou apagar funcionarios', function () {
    $admin = User::factory()->admin()->create();
    $func = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson('/api/funcionarios', ['nome' => 'X'])->assertStatus(405);
    $this->putJson("/api/funcionarios/{$func->id}", [])->assertStatus(404);
    $this->deleteJson("/api/funcionarios/{$func->id}")->assertStatus(404);
    $this->getJson('/api/funcionarios')->assertOk();
});
