<?php

use App\Models\Empresa;
use App\Models\RhFicheiro;
use App\Models\RhInfo;
use App\Models\Tipo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** Ficheiro real em disco: o fake deduz o mime pelo nome e nao serve para testar o conteudo. */
function comConteudoReal(string $nome, string $conteudo): UploadedFile
{
    $tmp = tempnam(sys_get_temp_dir(), 'rh');
    file_put_contents($tmp, $conteudo);

    return new UploadedFile($tmp, $nome, null, null, true);
}

function rhAdmin(): User
{
    return User::factory()->admin()->create();
}

it('lista as fichas de toda a empresa, por nome, com contagens', function () {
    $admin = rhAdmin();
    $a = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Ana']);
    $pendente = User::factory()->create(['empresa_id' => $admin->empresa_id, 'nome' => 'Bruno', 'estado_conta' => 'pendente']);
    User::factory()->create(); // outra empresa
    RhInfo::create(['empresa_id' => $admin->empresa_id, 'user_id' => $a->id, 'titulo' => 'NIF', 'valor' => '123']);
    RhInfo::create(['empresa_id' => $admin->empresa_id, 'user_id' => $a->id, 'titulo' => 'IBAN', 'valor' => 'PT50']);
    RhFicheiro::create(['empresa_id' => $admin->empresa_id, 'user_id' => $a->id, 'nome' => 'x.pdf', 'caminho' => 'rh/x', 'mime' => 'application/pdf', 'tamanho' => 5]);
    Sanctum::actingAs($admin);

    $r = $this->getJson('/api/rh/fichas')->assertOk()->assertJsonCount(3, 'data');
    $nomes = collect($r->json('data'))->pluck('nome')->all();
    expect($nomes)->toBe(collect($nomes)->sort()->values()->all());
    $ana = collect($r->json('data'))->firstWhere('id', $a->id);
    expect($ana['n_infos'])->toBe(2)->and($ana['n_ficheiros'])->toBe(1)
        ->and($ana)->toHaveKeys(['tipo_id', 'tipo_nome', 'email', 'permissoes']);
    expect(collect($r->json('data'))->firstWhere('id', $pendente->id)['n_infos'])->toBe(0);
});

it('mostra a ficha de uma pessoa sem expor o caminho', function () {
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    RhInfo::create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'titulo' => 'NIF', 'valor' => '123']);
    RhFicheiro::create(['empresa_id' => $admin->empresa_id, 'user_id' => $p->id, 'nome' => 'cv.pdf', 'caminho' => 'rh/segredo/abc', 'mime' => 'application/pdf', 'tamanho' => 99]);
    Sanctum::actingAs($admin);

    $r = $this->getJson("/api/rh/fichas/{$p->id}")->assertOk()
        ->assertJsonPath('data.user.id', $p->id)
        ->assertJsonPath('data.infos.0.titulo', 'NIF')
        ->assertJsonPath('data.ficheiros.0.nome', 'cv.pdf')
        ->assertJsonPath('data.ficheiros.0.tamanho', 99);
    expect($r->json('data.ficheiros.0'))->toHaveKeys(['id', 'nome', 'tamanho', 'mime', 'criado_em'])->not->toHaveKey('caminho');
    expect($r->getContent())->not->toContain('segredo');
});

it('sem gerir_rh: 401 anonimo, 403 funcionario comum', function () {
    $this->getJson('/api/rh/fichas')->assertUnauthorized();

    $empresa = Empresa::factory()->create();
    $func = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario']);
    Sanctum::actingAs($func);

    $this->getJson('/api/rh/fichas')->assertForbidden();
    $this->getJson("/api/rh/fichas/{$func->id}")->assertForbidden();
    $this->postJson("/api/rh/fichas/{$func->id}/infos", ['titulo' => 'a', 'valor' => 'b'])->assertForbidden();
    $this->putJson('/api/rh/infos/1', ['titulo' => 'a', 'valor' => 'b'])->assertForbidden();
    $this->deleteJson('/api/rh/infos/1')->assertForbidden();
    $this->postJson("/api/rh/fichas/{$func->id}/ficheiros")->assertForbidden();
    $this->getJson('/api/rh/ficheiros/1/download')->assertForbidden();
    $this->deleteJson('/api/rh/ficheiros/1')->assertForbidden();
});

it('gerir_rh nao vem nas predefinicoes e o admin tem-na sempre', function () {
    expect(Empresa::chavesPermissoes())->toContain('gerir_rh')->toHaveCount(13);
    expect(Empresa::permissoesPredefinidas('funcionario')['gerir_rh'])->toBeFalse()
        ->and(Empresa::permissoesPredefinidas('estagiario')['gerir_rh'])->toBeFalse();

    Sanctum::actingAs(rhAdmin());
    $this->getJson('/api/me')->assertJsonCount(13, 'user.permissoes');
});

it('um tipo com gerir_rh acede as fichas da sua empresa', function () {
    $empresa = Empresa::factory()->create();
    $tipo = Tipo::create(['empresa_id' => $empresa->id, 'nome' => 'RH', 'base' => 'funcionario', 'permissoes' => ['gerir_rh' => true]]);
    $rh = User::factory()->create(['empresa_id' => $empresa->id, 'papel' => 'funcionario', 'tipo_id' => $tipo->id]);
    $colega = User::factory()->create(['empresa_id' => $empresa->id]);
    Sanctum::actingAs($rh);

    $this->getJson('/api/rh/fichas')->assertOk()->assertJsonCount(2, 'data');
    $this->postJson("/api/rh/fichas/{$colega->id}/infos", ['titulo' => 'NIF', 'valor' => '1'])->assertCreated();
    $this->getJson('/api/me')->assertJsonFragment(['permissoes' => ['pedir_ferias', 'pedir_ausencia', 'pedir_licenca', 'anexar_documentos', 'marcar_presenca', 'registar_ocorrencias', 'criar_compromissos', 'melhorar_texto', 'gerir_rh']]);
});

it('isola outras empresas: id alheio e sempre 404', function () {
    Storage::fake('local');
    $admin = rhAdmin();
    $alheia = User::factory()->create();
    $info = RhInfo::create(['empresa_id' => $alheia->empresa_id, 'user_id' => $alheia->id, 'titulo' => 'T', 'valor' => 'V']);
    $ficheiro = RhFicheiro::create(['empresa_id' => $alheia->empresa_id, 'user_id' => $alheia->id, 'nome' => 'a.txt', 'caminho' => 'rh/x/a', 'mime' => 'text/plain', 'tamanho' => 1]);
    Storage::disk('local')->put('rh/x/a', 'x');
    Sanctum::actingAs($admin);

    $this->getJson('/api/rh/fichas')->assertJsonCount(1, 'data');
    $this->getJson("/api/rh/fichas/{$alheia->id}")->assertNotFound();
    $this->postJson("/api/rh/fichas/{$alheia->id}/infos", ['titulo' => 'a', 'valor' => 'b'])->assertNotFound();
    $this->putJson("/api/rh/infos/{$info->id}", ['titulo' => 'a', 'valor' => 'b'])->assertNotFound();
    $this->deleteJson("/api/rh/infos/{$info->id}")->assertNotFound();
    $this->postJson("/api/rh/fichas/{$alheia->id}/ficheiros", ['ficheiro' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])->assertNotFound();
    $this->getJson("/api/rh/ficheiros/{$ficheiro->id}/download")->assertNotFound();
    $this->deleteJson("/api/rh/ficheiros/{$ficheiro->id}")->assertNotFound();

    expect(RhInfo::count())->toBe(1)->and(RhFicheiro::count())->toBe(1);
    Storage::disk('local')->assertExists('rh/x/a');
});

it('cria, edita e apaga informacoes', function () {
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $id = $this->postJson("/api/rh/fichas/{$p->id}/infos", ['titulo' => 'NIF', 'valor' => '123456789'])
        ->assertCreated()->assertJsonPath('data.titulo', 'NIF')->assertJsonPath('data.valor', '123456789')
        ->assertJsonStructure(['data' => ['id', 'titulo', 'valor', 'criado_em']])->json('data.id');
    expect(RhInfo::find($id)->criado_por)->toBe($admin->id);

    $this->putJson("/api/rh/infos/{$id}", ['titulo' => 'NIF PT', 'valor' => '987'])
        ->assertOk()->assertJsonPath('data.titulo', 'NIF PT')->assertJsonPath('data.valor', '987');

    $this->deleteJson("/api/rh/infos/{$id}")->assertNoContent();
    expect(RhInfo::count())->toBe(0);
});

it('valida titulo e valor das informacoes', function () {
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    $url = "/api/rh/fichas/{$p->id}/infos";

    $this->postJson($url, [])->assertStatus(422)->assertJsonValidationErrors(['titulo', 'valor']);
    $this->postJson($url, ['titulo' => str_repeat('a', 81), 'valor' => 'x'])->assertStatus(422)->assertJsonValidationErrors('titulo');
    $this->postJson($url, ['titulo' => 'a', 'valor' => str_repeat('a', 2001)])->assertStatus(422)->assertJsonValidationErrors('valor');
    $this->postJson($url, ['titulo' => str_repeat('a', 80), 'valor' => str_repeat('a', 2000)])->assertCreated();

    $id = RhInfo::first()->id;
    $this->putJson("/api/rh/infos/{$id}", ['titulo' => 'a'])->assertStatus(422)->assertJsonValidationErrors('valor');
});

it('carrega, descarrega e apaga um ficheiro em disco privado', function () {
    Storage::fake('local');
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $r = $this->postJson("/api/rh/fichas/{$p->id}/ficheiros", ['ficheiro' => UploadedFile::fake()->createWithContent('Contrato final.txt', 'conteudo secreto')])
        ->assertCreated()
        ->assertJsonPath('data.nome', 'Contrato final.txt')
        ->assertJsonPath('data.tamanho', 16);
    expect($r->json('data'))->toHaveKeys(['id', 'nome', 'tamanho', 'mime', 'criado_em'])->not->toHaveKey('caminho');
    $f = RhFicheiro::find($r->json('data.id'));

    expect($f->caminho)->toStartWith("rh/{$admin->empresa_id}/{$p->id}/")->not->toContain('Contrato')
        ->and($f->criado_por)->toBe($admin->id);
    Storage::disk('local')->assertExists($f->caminho);
    Storage::disk('public')->assertMissing($f->caminho);

    $d = $this->get("/api/rh/ficheiros/{$f->id}/download", ['Accept' => 'application/json'])->assertOk();
    expect($d->streamedContent())->toBe('conteudo secreto');
    expect($d->headers->get('content-disposition'))->toContain('Contrato final.txt');

    $this->getJson("/api/rh/fichas/{$p->id}")->assertJsonCount(1, 'data.ficheiros');
    $this->deleteJson("/api/rh/ficheiros/{$f->id}")->assertNoContent();
    Storage::disk('local')->assertMissing($f->caminho);
    expect(RhFicheiro::count())->toBe(0);
});

it('sanitiza o nome original do ficheiro', function () {
    Storage::fake('local');
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);

    $this->postJson("/api/rh/fichas/{$p->id}/ficheiros", ['ficheiro' => UploadedFile::fake()->create('..\\..\\etc\\<b>x</b>.pdf', 10, 'application/pdf')])
        ->assertCreated();
    $nome = RhFicheiro::first()->nome;
    expect($nome)->not->toContain('/')->not->toContain('\\')->not->toContain('<');
});

it('valida tipo e tamanho do ficheiro', function () {
    Storage::fake('local');
    $admin = rhAdmin();
    $p = User::factory()->create(['empresa_id' => $admin->empresa_id]);
    Sanctum::actingAs($admin);
    $url = "/api/rh/fichas/{$p->id}/ficheiros";

    $this->postJson($url, [])->assertStatus(422)->assertJsonValidationErrors('ficheiro');
    $this->postJson($url, ['ficheiro' => UploadedFile::fake()->create('a.exe', 10, 'application/octet-stream')])->assertStatus(422)->assertJsonValidationErrors('ficheiro');
    $this->postJson($url, ['ficheiro' => UploadedFile::fake()->create('a.php', 10, 'text/x-php')])->assertStatus(422)->assertJsonValidationErrors('ficheiro');
    // Extensão permitida mas conteúdo de outro tipo.
    $this->postJson($url, ['ficheiro' => comConteudoReal('falso.pdf', '<?php echo 1;')])->assertStatus(422)->assertJsonValidationErrors('ficheiro');
    $this->postJson($url, ['ficheiro' => UploadedFile::fake()->create('grande.pdf', 10241, 'application/pdf')])->assertStatus(422)->assertJsonValidationErrors('ficheiro');
    expect(RhFicheiro::count())->toBe(0);

    foreach (['a.pdf' => 'application/pdf', 'a.png' => 'image/png', 'a.jpg' => 'image/jpeg', 'a.jpeg' => 'image/jpeg'] as $nome => $mime) {
        $this->postJson($url, ['ficheiro' => UploadedFile::fake()->create($nome, 10, $mime)])->assertCreated();
    }
    $this->postJson($url, ['ficheiro' => UploadedFile::fake()->create('limite.pdf', 10240, 'application/pdf')])->assertCreated();
});
