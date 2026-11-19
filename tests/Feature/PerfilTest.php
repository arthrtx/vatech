<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('admin e funcionario editam o proprio nome e email', function (User $user) {
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'Novo Nome', 'email' => 'novo@x.test', 'password_atual' => 'password'])
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

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password_atual' => 'password', 'papel' => 'admin', 'empresa_id' => 999])
        ->assertOk()
        ->assertJsonPath('user.papel', $papel)
        ->assertJsonPath('user.empresa_id', $empresa);

    expect($user->fresh())->papel->toBe($papel)->empresa_id->toBe($empresa);
});

it('limita a 5 tentativas por minuto (429 na 6a)', function () {
    Sanctum::actingAs(User::factory()->create(['email' => 'r@x.test']));

    foreach (range(1, 5) as $i) {
        $this->putJson('/api/me', ['nome' => 'A', 'email' => 'r@x.test'])->assertOk();
    }
    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'r@x.test'])->assertStatus(429);
});

it('mudar a password apaga os outros tokens e mantem o actual', function () {
    $user = User::factory()->create(['email' => 'p@x.test']);
    $atual = $user->createToken('a')->plainTextToken;
    $outro = $user->createToken('b')->plainTextToken;

    $this->withToken($atual)
        ->putJson('/api/me', ['nome' => 'P', 'email' => 'p@x.test', 'password' => 'novasenha1', 'password_atual' => 'password'])
        ->assertOk();

    expect($user->tokens()->count())->toBe(1);
    $this->app['auth']->forgetGuards();
    $this->withToken($atual)->getJson('/api/me')->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($outro)->getJson('/api/me')->assertStatus(401);
});

it('mudar o email sem password_atual da 422', function () {
    Sanctum::actingAs(User::factory()->create(['email' => 'a@x.test']));

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'b@x.test'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password_atual');
});

it('mudar o email com password_atual errada da 422 e nao altera', function () {
    $user = User::factory()->create(['email' => 'a@x.test']);
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'b@x.test', 'password_atual' => 'errada'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password_atual');

    expect($user->fresh()->email)->toBe('a@x.test');
});

it('so o nome muda sem password_atual', function () {
    $user = User::factory()->create(['email' => 'a@x.test']);
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'Novo', 'email' => 'a@x.test'])->assertOk();
    expect($user->fresh()->nome)->toBe('Novo');
});

it('password_atual sem password nao e erro se o email nao mudou', function () {
    Sanctum::actingAs(User::factory()->create(['email' => 'a@x.test']));

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password_atual' => 'qualquer'])->assertOk();
});

it('password vazia e ignorada', function () {
    $user = User::factory()->create(['email' => 'a@x.test']);
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'password' => ''])->assertOk();
    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

it('empresa_id inexistente e ignorado', function () {
    $user = User::factory()->create(['email' => 'a@x.test']);
    $empresa = $user->empresa_id;
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => 'A', 'email' => 'a@x.test', 'empresa_id' => 999999])->assertOk();
    expect($user->fresh()->empresa_id)->toBe($empresa);
});
