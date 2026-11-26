<?php

namespace App\Http\Controllers;

use App\Models\RhFicheiro;
use App\Models\RhInfo;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FichaRhController extends Controller
{
    public const MAX_KB = 10240;

    public const TIPOS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx', 'txt'];

    public function index(Request $request): JsonResponse
    {
        $users = User::with('tipo')
            ->withCount(['rhFicheiros as n_ficheiros', 'rhInfos as n_infos'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->orderBy('nome')
            ->get();

        return response()->json(['data' => $users->map(fn (User $u) => $this->pessoa($u) + [
            'n_ficheiros' => (int) $u->n_ficheiros,
            'n_infos' => (int) $u->n_infos,
        ])]);
    }

    public function show(Request $request, int $userId): JsonResponse
    {
        $user = $this->pessoaDaEmpresa($request, $userId);

        return response()->json(['data' => [
            'user' => $this->pessoa($user),
            'infos' => $user->rhInfos()->orderBy('id')->get()->map->toContrato(),
            'ficheiros' => $user->rhFicheiros()->orderBy('id')->get()->map->toContrato(),
        ]]);
    }

    public function storeInfo(Request $request, int $userId): JsonResponse
    {
        $user = $this->pessoaDaEmpresa($request, $userId);
        $info = RhInfo::create($this->validarInfo($request) + [
            'empresa_id' => $user->empresa_id,
            'user_id' => $user->id,
            'criado_por' => $request->user()->id,
        ]);

        return response()->json(['data' => $info->toContrato()], 201);
    }

    public function updateInfo(Request $request, int $id): JsonResponse
    {
        $info = RhInfo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $info->update($this->validarInfo($request));

        return response()->json(['data' => $info->toContrato()]);
    }

    public function destroyInfo(Request $request, int $id): JsonResponse
    {
        RhInfo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function storeFicheiro(Request $request, int $userId): JsonResponse
    {
        $user = $this->pessoaDaEmpresa($request, $userId);
        $tipos = implode(',', self::TIPOS);
        $tipoInvalido = 'Tipo de ficheiro não permitido (PDF, imagem, Word, Excel ou texto).';
        $request->validate([
            'ficheiro' => ['required', 'file', 'extensions:'.$tipos, 'mimes:'.$tipos, 'max:'.self::MAX_KB],
        ], [
            'ficheiro.required' => 'Escolha um ficheiro.',
            'ficheiro.file' => 'Não foi possível ler o ficheiro.',
            'ficheiro.extensions' => $tipoInvalido,
            'ficheiro.mimes' => $tipoInvalido,
            'ficheiro.max' => 'O ficheiro pode ter no máximo 10 MB.',
        ]);

        $f = $request->file('ficheiro');
        $caminho = $f->store("rh/{$user->empresa_id}/{$user->id}", 'local');

        $ficheiro = RhFicheiro::create([
            'empresa_id' => $user->empresa_id,
            'user_id' => $user->id,
            'nome' => $this->nomeSeguro($f->getClientOriginalName()),
            'caminho' => $caminho,
            'mime' => $f->getClientMimeType(),
            'tamanho' => $f->getSize(),
            'criado_por' => $request->user()->id,
        ]);

        return response()->json(['data' => $ficheiro->toContrato()], 201);
    }

    public function download(Request $request, int $id): StreamedResponse
    {
        $f = RhFicheiro::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        abort_unless(Storage::disk('local')->exists($f->caminho), 404);

        return Storage::disk('local')->download($f->caminho, $f->nome, array_filter(['Content-Type' => $f->mime]));
    }

    public function destroyFicheiro(Request $request, int $id): JsonResponse
    {
        $f = RhFicheiro::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        Storage::disk('local')->delete($f->caminho);
        $f->delete();

        return response()->json(null, 204);
    }

    private function pessoaDaEmpresa(Request $request, int $userId): User
    {
        return User::with('tipo')->where('empresa_id', $request->user()->empresa_id)->findOrFail($userId);
    }

    /** @return array<string,mixed> */
    private function pessoa(User $u): array
    {
        return $u->toContrato() + ['tipo_id' => $u->tipo_id, 'tipo_nome' => $u->tipo?->nome];
    }

    /** @return array{titulo:string,valor:string} */
    private function validarInfo(Request $request): array
    {
        return $request->validate([
            'titulo' => ['required', 'string', 'max:80'],
            'valor' => ['required', 'string', 'max:2000'],
        ]);
    }

    /** Sem caminhos nem caracteres de controlo; o nome só serve de rótulo e de nome na descarga. */
    private function nomeSeguro(string $nome): string
    {
        $nome = basename(str_replace('\\', '/', $nome));
        $nome = trim((string) preg_replace('/[^\p{L}\p{N}._\- ()]/u', '_', $nome));

        return mb_substr($nome === '' ? 'ficheiro' : $nome, -150);
    }
}
