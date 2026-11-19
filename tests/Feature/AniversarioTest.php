<?php

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('a data de nascimento e opcional, guarda-se e pode ser apagada', function () {
    $user = User::factory()->create(['email' => 'eu@x.test']);
    Sanctum::actingAs($user);
    $base = ['nome' => $user->nome, 'email' => 'eu@x.test'];

    $this->putJson('/api/me', $base)->assertOk()->assertJsonPath('user.data_nascimento', null);

    $this->putJson('/api/me', $base + ['data_nascimento' => '1990-05-17'])
        ->assertOk()
        ->assertJsonPath('user.data_nascimento', '1990-05-17');

    // Um PUT sem o campo (ex.: alterar a palavra-passe) nao apaga a data.
    $this->putJson('/api/me', $base)->assertOk()->assertJsonPath('user.data_nascimento', '1990-05-17');

    $this->putJson('/api/me', $base + ['data_nascimento' => null])->assertOk()->assertJsonPath('user.data_nascimento', null);
});

it('recusa datas de nascimento invalidas', function (string $valor) {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->putJson('/api/me', ['nome' => $user->nome, 'email' => $user->email, 'data_nascimento' => $valor])
        ->assertStatus(422)->assertJsonValidationErrors('data_nascimento');
})->with(['futuro' => '2999-01-01', 'formato' => '17/05/1990', 'antiga' => '1800-01-01']);

it('a agenda lista os aniversarios da empresa sem expor o ano de nascimento', function () {
    $empresa = Empresa::factory()->create();
    $eu = User::factory()->create(['empresa_id' => $empresa->id]);
    $ana = User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Ana', 'data_nascimento' => '1990-12-10']);
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Sem data']);
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Fora do mes', 'data_nascimento' => '1985-03-01']);
    User::factory()->create(['nome' => 'Outra empresa', 'data_nascimento' => '1990-12-10']);
    Sanctum::actingAs($eu);

    $this->getJson('/api/aniversarios?de=2026-12-01&ate=2026-12-31')
        ->assertOk()
        ->assertExactJson(['data' => [['user' => ['id' => $ana->id, 'nome' => 'Ana'], 'data' => '2026-12-10']]]);
});

it('aniversarios atravessam o ano e 29 de fevereiro cai a 28 nos anos nao bissextos', function () {
    $empresa = Empresa::factory()->create();
    $eu = User::factory()->create(['empresa_id' => $empresa->id]);
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Bia', 'data_nascimento' => '2000-01-02']);
    User::factory()->create(['empresa_id' => $empresa->id, 'nome' => 'Bisexta', 'data_nascimento' => '2000-02-29']);
    Sanctum::actingAs($eu);

    $this->getJson('/api/aniversarios?de=2026-12-28&ate=2027-01-10')
        ->assertOk()->assertJsonPath('data.0.data', '2027-01-02')->assertJsonCount(1, 'data');

    $this->getJson('/api/aniversarios?de=2027-02-20&ate=2027-03-05')
        ->assertOk()->assertJsonPath('data.0.data', '2027-02-28');

    $this->getJson('/api/aniversarios?de=2028-02-20&ate=2028-03-05')
        ->assertOk()->assertJsonPath('data.0.data', '2028-02-29');
});

it('exige sessao e intervalo valido', function () {
    $this->getJson('/api/aniversarios?de=2026-12-01&ate=2026-12-31')->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/aniversarios')->assertStatus(422);
});
