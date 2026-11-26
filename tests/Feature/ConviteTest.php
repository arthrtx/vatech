<?php

use App\Models\Convite;
use App\Models\Empresa;
use App\Models\User;
use App\Notifications\ConviteNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function criarConvite(User $admin, array $extra = []): Convite
{
    return Convite::create([
        'empresa_id' => $admin->empresa_id,
        'nome' => 'Ana',
        'email' => 'ana@x.test',
        'papel' => 'funcionario',
        'token' => 'tok-'.bin2hex(random_bytes(8)),
        'convidado_por' => $admin->id,
        'expira_em' => now()->addDays(7),
        ...$extra,
    ]);
}

function dadosAceitar(array $extra = []): array
{
    return ['password' => 'segredo123', 'password_confirmation' => 'segredo123', 'aceita_termos' => true, ...$extra];
}

it('so o admin convida', function () {
    $func = User::factory()->create();
    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => 'a@x.test'])->assertStatus(401);

    Sanctum::actingAs($func);
    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => 'a@x.test'])->assertStatus(403);
    $this->getJson('/api/funcionarios/convites')->assertStatus(403);
    expect(Convite::count())->toBe(0);
});

it('o admin convida, lista, reenvia e cancela', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $r = $this->postJson('/api/funcionarios/convites', ['nome' => 'Ana', 'email' => 'ana@x.test'])
        ->assertStatus(201)
        ->assertJsonPath('data.papel', 'funcionario')
        ->assertJsonStructure(['data' => ['id', 'nome', 'email', 'papel', 'expira_em', 'link']]);
    $convite = Convite::firstOrFail();
    expect($r->json('data.link'))->toBe(rtrim(config('app.frontend_url'), '/').'/convite/'.$convite->token)
        ->and($convite->empresa_id)->toBe($admin->empresa_id)
        ->and($convite->expira_em->isFuture())->toBeTrue();
    Notification::assertSentOnDemand(ConviteNotification::class);

    $this->postJson('/api/funcionarios/convites', ['nome' => 'Rui', 'email' => 'rui@x.test', 'papel' => 'estagiario'])
        ->assertStatus(201)->assertJsonPath('data.papel', 'estagiario');
    $this->getJson('/api/funcionarios/convites')->assertOk()->assertJsonCount(2, 'data');

    $antigo = $convite->token;
    $this->postJson("/api/funcionarios/convites/{$convite->id}/reenviar")
        ->assertOk()->assertJsonStructure(['data' => ['id', 'link']]);
    expect($convite->refresh()->token)->not->toBe($antigo);

    $this->deleteJson("/api/funcionarios/convites/{$convite->id}")->assertStatus(204);
    $this->getJson('/api/funcionarios/convites')->assertOk()->assertJsonCount(1, 'data');
});

it('valida o convite: papel invalido e email ja existente dao 422', function () {
    $admin = User::factory()->admin()->create();
    $existente = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => $existente->email])
        ->assertStatus(422)->assertJsonValidationErrors('email');
    $this->postJson('/api/funcionarios/convites', ['nome' => 'A', 'email' => 'a@x.test', 'papel' => 'admin'])
        ->assertStatus(422)->assertJsonValidationErrors('papel');
});

it('o admin nao gere convites de outra empresa', function () {
    $admin = User::factory()->admin()->create();
    $outro = User::factory()->admin()->create();
    $convite = criarConvite($outro);
    Sanctum::actingAs($admin);

    $this->getJson('/api/funcionarios/convites')->assertOk()->assertJsonCount(0, 'data');
    $this->postJson("/api/funcionarios/convites/{$convite->id}/reenviar")->assertStatus(404);
    $this->deleteJson("/api/funcionarios/convites/{$convite->id}")->assertStatus(404);
});

it('fluxo completo: convite, aceitar, pendente sem login, aprovar, login', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $this->postJson('/api/funcionarios/convites', ['nome' => 'Ana', 'email' => 'ana@x.test'])->assertStatus(201);
    $token = Convite::firstOrFail()->token;
    $this->app['auth']->forgetGuards();

    $this->getJson("/api/convites/{$token}")->assertOk()->assertExactJson(['data' => ['nome' => 'Ana', 'email' => 'ana@x.test', 'texto' => Empresa::TEXTO_CONVITE_PREDEFINIDO]]);
    $this->postJson("/api/convites/{$token}/aceitar", dadosAceitar())->assertStatus(201)->assertJsonStructure(['message']);

    $user = User::where('email', 'ana@x.test')->firstOrFail();
    expect($user->estado_conta)->toBe('pendente')
        ->and($user->empresa_id)->toBe($admin->empresa_id)
        ->and($user->papel)->toBe('funcionario')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->termos_aceites_em)->not->toBeNull();

    $this->postJson('/api/login', ['email' => 'ana@x.test', 'password' => 'segredo123'])
        ->assertStatus(403)->assertExactJson(['message' => 'A sua conta aguarda autorização do administrador.']);

    Sanctum::actingAs($admin);
    $this->getJson('/api/funcionarios')->assertOk()->assertJsonFragment(['email' => 'ana@x.test', 'estado_conta' => 'pendente']);
    $this->postJson("/api/funcionarios/{$user->id}/aprovar")->assertOk()->assertJsonPath('data.estado_conta', 'aprovado');
    $this->app['auth']->forgetGuards();

    $this->postJson('/api/login', ['email' => 'ana@x.test', 'password' => 'segredo123'])
        ->assertOk()->assertJsonPath('user.estado_conta', 'aprovado');
});

it('rejeita token inexistente, expirado ou ja usado', function () {
    $admin = User::factory()->admin()->create();
    $expirado = criarConvite($admin, ['email' => 'e@x.test', 'token' => 'expirado', 'expira_em' => now()->subMinute()]);
    $usado = criarConvite($admin, ['email' => 'u@x.test', 'token' => 'usado', 'usado_em' => now()]);

    foreach (['nao-existe', 'expirado', 'usado'] as $t) {
        $this->getJson("/api/convites/{$t}")->assertStatus(404);
        $this->postJson("/api/convites/{$t}/aceitar", dadosAceitar())->assertStatus(404);
    }
    expect(User::whereIn('email', [$expirado->email, $usado->email])->count())->toBe(0);
});

it('o convite so se usa uma vez', function () {
    $admin = User::factory()->admin()->create();
    $convite = criarConvite($admin);

    $this->postJson("/api/convites/{$convite->token}/aceitar", dadosAceitar())->assertStatus(201);
    $this->postJson("/api/convites/{$convite->token}/aceitar", dadosAceitar())->assertStatus(404);
    expect(User::where('email', 'ana@x.test')->count())->toBe(1);
});

it('exige termos e palavra-passe confirmada ao aceitar', function () {
    $admin = User::factory()->admin()->create();
    $convite = criarConvite($admin);

    $this->postJson("/api/convites/{$convite->token}/aceitar", dadosAceitar(['aceita_termos' => false]))
        ->assertStatus(422)->assertJsonValidationErrors('aceita_termos');
    $this->postJson("/api/convites/{$convite->token}/aceitar", dadosAceitar(['password_confirmation' => 'outra']))
        ->assertStatus(422)->assertJsonValidationErrors('password');
    expect(User::where('email', 'ana@x.test')->exists())->toBeFalse();
});

it('o login distingue pendente, recusado e aprovado', function () {
    $pendente = User::factory()->create(['email' => 'p@x.test']);
    $pendente->forceFill(['estado_conta' => 'pendente'])->save();
    $recusado = User::factory()->create(['email' => 'r@x.test']);
    $recusado->forceFill(['estado_conta' => 'recusado'])->save();
    User::factory()->create(['email' => 'a@x.test']);

    $this->postJson('/api/login', ['email' => 'p@x.test', 'password' => 'password'])
        ->assertStatus(403)->assertJsonPath('message', 'A sua conta aguarda autorização do administrador.')->assertJsonMissingPath('token');
    $this->postJson('/api/login', ['email' => 'r@x.test', 'password' => 'password'])
        ->assertStatus(403)->assertJsonPath('message', 'A sua conta não foi autorizada.')->assertJsonMissingPath('token');
    $this->postJson('/api/login', ['email' => 'a@x.test', 'password' => 'password'])
        ->assertOk()->assertJsonStructure(['token']);
    // palavra-passe errada continua a nao revelar o estado
    $this->postJson('/api/login', ['email' => 'p@x.test', 'password' => 'errada'])->assertStatus(422);
});

it('aprovar e recusar so o admin e so da mesma empresa', function () {
    $admin = User::factory()->admin()->create();
    $alvo = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    $alvo->forceFill(['estado_conta' => 'pendente'])->save();
    $alheio = User::factory()->create(['empresa_id' => Empresa::factory()->create()->id]);
    $alheio->forceFill(['estado_conta' => 'pendente'])->save();

    Sanctum::actingAs(User::factory()->create(['empresa_id' => $admin->empresa_id]));
    $this->postJson("/api/funcionarios/{$alvo->id}/aprovar")->assertStatus(403);
    $this->postJson("/api/funcionarios/{$alvo->id}/recusar")->assertStatus(403);

    Sanctum::actingAs($admin);
    $this->postJson("/api/funcionarios/{$alheio->id}/aprovar")->assertStatus(404);
    $this->postJson("/api/funcionarios/{$alheio->id}/recusar")->assertStatus(404);
    expect($alheio->refresh()->estado_conta)->toBe('pendente');

    $this->postJson("/api/funcionarios/{$alvo->id}/recusar")->assertOk()->assertJsonPath('data.estado_conta', 'recusado');
    expect($alvo->refresh())->aprovado_por->toBe($admin->id);
    $this->postJson("/api/funcionarios/{$alvo->id}/aprovar")->assertOk()->assertJsonPath('data.estado_conta', 'aprovado');
});

it('o admin nao recusa a propria conta', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->postJson("/api/funcionarios/{$admin->id}/recusar")->assertStatus(422);
    expect($admin->refresh()->estado_conta)->toBe('aprovado');
});

it('o registo aberto deixou de existir', function () {
    $this->postJson('/api/registo', ['nome' => 'A', 'email' => 'a@x.test'])->assertStatus(404);
});

it('texto do convite: predefinido, guardar e repor', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson('/api/definicoes/convite')->assertOk()
        ->assertJsonPath('data.texto', Empresa::TEXTO_CONVITE_PREDEFINIDO)
        ->assertJsonPath('data.predefinido', Empresa::TEXTO_CONVITE_PREDEFINIDO);

    $this->putJson('/api/definicoes/convite', ['texto' => 'Olá equipa Acme.'])->assertOk()
        ->assertJsonPath('data.texto', 'Olá equipa Acme.')
        ->assertJsonPath('data.predefinido', Empresa::TEXTO_CONVITE_PREDEFINIDO);
    $this->getJson('/api/definicoes/convite')->assertJsonPath('data.texto', 'Olá equipa Acme.');

    $this->putJson('/api/definicoes/convite', ['texto' => '   '])->assertOk()
        ->assertJsonPath('data.texto', Empresa::TEXTO_CONVITE_PREDEFINIDO);
    expect(Empresa::find($admin->empresa_id)->texto_convite)->toBeNull();

    $this->putJson('/api/definicoes/convite', ['texto' => 'x'])->assertOk();
    $this->putJson('/api/definicoes/convite', ['texto' => null])->assertOk()
        ->assertJsonPath('data.texto', Empresa::TEXTO_CONVITE_PREDEFINIDO);

    $this->putJson('/api/definicoes/convite', ['texto' => str_repeat('a', 1001)])->assertStatus(422);
});

it('texto do convite: so o admin', function () {
    $this->getJson('/api/definicoes/convite')->assertStatus(401);

    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/definicoes/convite')->assertStatus(403);
    $this->putJson('/api/definicoes/convite', ['texto' => 'x'])->assertStatus(403);
});

it('texto do convite: isolado por empresa e visivel no GET publico', function () {
    $adminA = User::factory()->admin()->create();
    $adminB = User::factory()->admin()->create(['empresa_id' => Empresa::factory()->create()->id]);

    Sanctum::actingAs($adminA);
    $this->putJson('/api/definicoes/convite', ['texto' => 'Texto da A'])->assertOk();

    Sanctum::actingAs($adminB);
    $this->getJson('/api/definicoes/convite')->assertJsonPath('data.texto', Empresa::TEXTO_CONVITE_PREDEFINIDO);

    $conviteA = criarConvite($adminA);
    $conviteB = criarConvite($adminB, ['email' => 'b@x.test']);

    $this->getJson('/api/convites/'.$conviteA->token)->assertOk()
        ->assertJsonPath('data.texto', 'Texto da A')
        ->assertJsonPath('data.nome', 'Ana');
    $this->getJson('/api/convites/'.$conviteB->token)->assertOk()
        ->assertJsonPath('data.texto', Empresa::TEXTO_CONVITE_PREDEFINIDO);
});
