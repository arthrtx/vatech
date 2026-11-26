<?php

namespace App\Http\Controllers;

use App\Models\RhFicheiro;
use App\Models\RhInfo;
use App\Models\User;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FichaRhController extends Controller
{
    public const MAX_KB = 10240;

    public const TIPOS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx', 'txt'];

    public function index(Request $request): JsonResponse
    {
        $users = User::with(['tipo', 'empresa'])
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

        RegistoAtividade::registar('rh', "{$request->user()->nome} acrescentou uma informação à ficha de {$user->nome}", $request->user(), $user);

        return response()->json(['data' => $info->toContrato()], 201);
    }

    public function updateInfo(Request $request, int $id): JsonResponse
    {
        $info = RhInfo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $info->update($this->validarInfo($request));
        RegistoAtividade::registar('rh', "{$request->user()->nome} editou uma informação da ficha de ".$this->nomeDe($info->user_id), $request->user(), User::find($info->user_id));

        return response()->json(['data' => $info->toContrato()]);
    }

    public function destroyInfo(Request $request, int $id): JsonResponse
    {
        $info = RhInfo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $info->delete();
        RegistoAtividade::registar('rh', "{$request->user()->nome} apagou uma informação da ficha de ".$this->nomeDe($info->user_id), $request->user(), User::find($info->user_id));

        return response()->json(null, 204);
    }

    public function storeFicheiro(Request $request, int $userId): JsonResponse
    {
        $user = $this->pessoaDaEmpresa($request, $userId);
        $tipos = implode(',', self::TIPOS);
        $tipoInvalido = 'Tipo de ficheiro não permitido (PDF, imagem, Word, Excel ou texto).';
        $request->validate([
            'ficheiro' => ['required', 'file', 'extensions:'.$tipos, 'mimes:'.$tipos, 'max:'.self::MAX_KB],
            'categoria' => ['required', 'string', Rule::in(RhFicheiro::CATEGORIAS)],
            'categoria_nome' => [Rule::requiredIf($request->input('categoria') === 'personalizado'), 'nullable', 'string', 'max:60'],
        ], [
            'categoria.required' => 'Escolha o tipo de documento.',
            'categoria.in' => 'Tipo de documento inválido.',
            'categoria_nome.required' => 'Indique o nome do tipo de documento.',
            'categoria_nome.max' => 'O nome do tipo pode ter no máximo 60 caracteres.',
            'ficheiro.required' => 'Escolha um ficheiro.',
            'ficheiro.file' => 'Não foi possível ler o ficheiro.',
            'ficheiro.extensions' => $tipoInvalido,
            'ficheiro.mimes' => $tipoInvalido,
            'ficheiro.max' => 'O ficheiro pode ter no máximo 10 MB.',
        ]);

        $categoria = $request->input('categoria');
        $categoriaNome = $categoria === 'personalizado' ? trim((string) $request->input('categoria_nome')) : null;
        if ($categoria === 'personalizado' && $categoriaNome === '') {
            throw ValidationException::withMessages(['categoria_nome' => 'Indique o nome do tipo de documento.']);
        }

        $f = $request->file('ficheiro');
        $caminho = $f->store("rh/{$user->empresa_id}/{$user->id}", 'local');

        $ficheiro = RhFicheiro::create([
            'empresa_id' => $user->empresa_id,
            'user_id' => $user->id,
            'nome' => $this->nomeSeguro($f->getClientOriginalName()),
            'categoria' => $categoria,
            'categoria_nome' => $categoriaNome,
            'caminho' => $caminho,
            'mime' => $f->getClientMimeType(),
            'tamanho' => $f->getSize(),
            'criado_por' => $request->user()->id,
        ]);

        RegistoAtividade::registar('rh', "{$request->user()->nome} carregou um ficheiro na ficha de {$user->nome}", $request->user(), $user);

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
        RegistoAtividade::registar('rh', "{$request->user()->nome} apagou um ficheiro da ficha de ".$this->nomeDe($f->user_id), $request->user(), User::find($f->user_id));

        return response()->json(null, 204);
    }

    private function nomeDe(int $userId): string
    {
        return User::withTrashed()->find($userId)?->nome ?? 'uma pessoa';
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
