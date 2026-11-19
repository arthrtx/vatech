<?php

use App\Models\Anexo;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function pedidoPendenteDe(User $user): Pedido
{
    return Pedido::factory()->create(['empresa_id' => $user->empresa_id, 'user_id' => $user->id, 'estado' => 'pendente']);
}

it('guarda o anexo na base de dados e devolve os bytes iguais na descarga', function () {
    $user = User::factory()->create();
    $pedido = pedidoPendenteDe($user);
    Sanctum::actingAs($user);
    $bytes = random_bytes(2048); // binário com bytes inválidos em UTF-8

    $r = $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => [UploadedFile::fake()->createWithContent('atestado.pdf', $bytes)]])
        ->assertCreated();
    $id = $r->json('data.0.id');

    $r->assertJsonPath('data.0.nome', 'atestado.pdf')->assertJsonMissingPath('data.0.conteudo');
    expect(Anexo::find($id)->conteudo->conteudo)->toBe($bytes);

    $descarga = $this->get("/api/pedidos/{$pedido->id}/anexos/{$id}")->assertOk();
    expect($descarga->streamedContent())->toBe($bytes);
    expect($descarga->headers->get('content-disposition'))->toContain('atestado.pdf');
});

it('a lista de pedidos não traz os bytes dos anexos', function () {
    $user = User::factory()->create();
    $pedido = pedidoPendenteDe($user);
    Sanctum::actingAs($user);
    $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => [UploadedFile::fake()->createWithContent('a.txt', 'olá')]])->assertCreated();

    $texto = $this->getJson('/api/pedidos')->assertOk()->getContent();
    expect($texto)->toContain('a.txt')->not->toContain('conteudo');
});

it('apagar o anexo ou o pedido remove também os bytes', function () {
    $user = User::factory()->create();
    $pedido = pedidoPendenteDe($user);
    Sanctum::actingAs($user);
    $ids = [];
    foreach (['um.txt', 'dois.txt'] as $nome) {
        $ids[] = $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => [UploadedFile::fake()->createWithContent($nome, 'x')]])->json('data.0.id');
    }

    $this->deleteJson("/api/pedidos/{$pedido->id}/anexos/{$ids[0]}")->assertNoContent();
    expect(DB::table('anexo_conteudos')->count())->toBe(1);

    $this->deleteJson("/api/pedidos/{$pedido->id}")->assertNoContent();
    expect(DB::table('anexo_conteudos')->count())->toBe(0)->and(DB::table('anexos')->count())->toBe(0);
});

it('anexo sem bytes (ficheiro perdido com o disco antigo) responde 404', function () {
    $user = User::factory()->create();
    $pedido = pedidoPendenteDe($user);
    $anexo = $pedido->anexos()->create(['nome' => 'velho.pdf', 'mime' => 'application/pdf', 'tamanho' => 10]);
    Sanctum::actingAs($user);

    $this->get("/api/pedidos/{$pedido->id}/anexos/{$anexo->id}")->assertNotFound();
});

it('outro funcionário não descarrega o anexo; o admin da empresa sim', function () {
    $dono = User::factory()->create();
    $pedido = pedidoPendenteDe($dono);
    Sanctum::actingAs($dono);
    $id = $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => [UploadedFile::fake()->createWithContent('a.txt', 'segredo')]])->json('data.0.id');

    Sanctum::actingAs(User::factory()->create(['empresa_id' => $dono->empresa_id]));
    $this->get("/api/pedidos/{$pedido->id}/anexos/{$id}")->assertNotFound();

    Sanctum::actingAs(User::factory()->admin()->create(['empresa_id' => $dono->empresa_id]));
    $this->get("/api/pedidos/{$pedido->id}/anexos/{$id}")->assertOk();
});

it('mantém os limites: máximo de 5 por pedido e tipos permitidos', function () {
    $user = User::factory()->create();
    $pedido = pedidoPendenteDe($user);
    Sanctum::actingAs($user);

    $seis = array_map(fn ($i) => UploadedFile::fake()->createWithContent("f{$i}.txt", 'x'), range(1, 6));
    $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => $seis])->assertStatus(422)->assertJsonValidationErrors('anexos');
    $this->postJson("/api/pedidos/{$pedido->id}/anexos", ['anexos' => [UploadedFile::fake()->createWithContent('v.exe', 'x')]])->assertStatus(422);
});
