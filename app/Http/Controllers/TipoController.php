<?php

namespace App\Http\Controllers;

use App\Models\Convite;
use App\Models\Empresa;
use App\Models\Tipo;
use App\Models\User;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TipoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tipos = Tipo::where('empresa_id', $request->user()->empresa_id)->orderBy('nome')->get();

        return response()->json(['data' => $tipos->map->toContrato()]);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:40'],
            'base' => ['required', 'in:funcionario,estagiario'],
            'permissoes' => ['sometimes', 'array'],
        ]);
        $empresaId = $request->user()->empresa_id;
        $this->validarNome($dados['nome'], $empresaId);

        $tipo = Tipo::create([
            'empresa_id' => $empresaId,
            'nome' => trim($dados['nome']),
            'base' => $dados['base'],
            'permissoes' => $this->permissoesValidas($dados['permissoes'] ?? []),
        ]);

        RegistoAtividade::registar('definicoes', "{$request->user()->nome} criou o tipo {$tipo->nome}", $request->user());

        return response()->json(['data' => $tipo->toContrato()], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tipo = Tipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:40'],
            'base' => ['sometimes', 'string'],
            'permissoes' => ['sometimes', 'array'],
        ]);

        if (isset($dados['base']) && $dados['base'] !== $tipo->base) {
            throw ValidationException::withMessages(['base' => ['A base de um tipo não pode ser alterada.']]);
        }
        if (isset($dados['nome'])) {
            $this->validarNome($dados['nome'], $tipo->empresa_id, $tipo->id);
            $tipo->nome = trim($dados['nome']);
        }
        if (isset($dados['permissoes'])) {
            $tipo->permissoes = $this->permissoesValidas($dados['permissoes']);
        }
        $tipo->save();
        RegistoAtividade::registar('definicoes', "{$request->user()->nome} alterou o tipo {$tipo->nome}", $request->user());

        return response()->json(['data' => $tipo->toContrato()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tipo = Tipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (User::where('tipo_id', $tipo->id)->exists() || Convite::validos()->where('tipo_id', $tipo->id)->exists()) {
            return response()->json(['message' => 'Há pessoas com este tipo. Passe-as para outro tipo antes de apagar.'], 409);
        }

        DB::transaction(function () use ($tipo) {
            // Restos sem efeito (contas apagadas, convites usados ou expirados) largam o tipo.
            User::onlyTrashed()->where('tipo_id', $tipo->id)->update(['tipo_id' => null]);
            Convite::where('tipo_id', $tipo->id)->update(['tipo_id' => null]);
            $tipo->delete();
        });
        RegistoAtividade::registar('definicoes', "{$request->user()->nome} apagou o tipo {$tipo->nome}", $request->user());

        return response()->json(null, 204);
    }

    /** Muda o tipo de uma pessoa (com tipo o papel é o da base; null: sem tipo, e o papel só muda se for enviado). */
    public function definirDaPessoa(Request $request, int $id): JsonResponse
    {
        $dados = $request->validate([
            'tipo_id' => ['present', 'nullable', 'integer'],
            'papel' => ['sometimes', 'in:funcionario,estagiario'],
        ]);
        $admin = $request->user();

        $user = User::where('empresa_id', $admin->empresa_id)->findOrFail($id);
        if ($user->isAdmin()) {
            throw ValidationException::withMessages(['tipo_id' => ['Uma conta de administrador não tem tipo.']]);
        }

        $papelAntes = $user->papel;
        $tipoAntes = $user->tipo?->nome;

        if ($dados['tipo_id'] === null) {
            $user->forceFill(['tipo_id' => null, 'papel' => $dados['papel'] ?? $user->papel])->save();
        } else {
            $tipo = Tipo::where('empresa_id', $admin->empresa_id)->findOrFail($dados['tipo_id']);
            $user->forceFill(['tipo_id' => $tipo->id, 'papel' => $tipo->base])->save();
        }
        $user->load('tipo');

        // Uma só linha no histórico, com o que mudou (papel e/ou tipo).
        $mudancas = [];
        if ($user->papel !== $papelAntes) {
            $mudancas[] = 'o papel passou a '.($user->papel === 'estagiario' ? 'estagiário' : 'funcionário');
        }
        if ($user->tipo?->nome !== $tipoAntes) {
            $mudancas[] = $user->tipo ? "o tipo passou a {$user->tipo->nome}" : 'ficou sem tipo';
        }
        if ($mudancas !== []) {
            RegistoAtividade::registar('conta', "{$admin->nome} alterou {$user->nome}: ".implode(' e ', $mudancas), $admin, $user);
        }

        return response()->json(['data' => $user->toContrato() + ['tipo_id' => $user->tipo_id, 'tipo_nome' => $user->tipo?->nome]]);
    }

    private function validarNome(string $nome, int $empresaId, ?int $ignorar = null): void
    {
        $nome = trim($nome);
        $erro = null;
        if ($nome === '') {
            $erro = 'O nome é obrigatório.';
        } elseif (in_array(Str::lower(Str::ascii($nome)), Tipo::NOMES_PROIBIDOS, true)) {
            $erro = 'Este nome está reservado.';
        } elseif (Tipo::where('empresa_id', $empresaId)->whereRaw('lower(nome) = ?', [mb_strtolower($nome)])
            ->when($ignorar, fn ($q) => $q->where('id', '!=', $ignorar))->exists()) {
            $erro = 'Já existe um tipo com este nome.';
        }
        if ($erro) {
            throw ValidationException::withMessages(['nome' => [$erro]]);
        }
    }

    /**
     * @param  array<string,mixed>  $permissoes
     * @return array<string,bool>
     */
    private function permissoesValidas(array $permissoes): array
    {
        $erros = [];
        foreach ($permissoes as $chave => $valor) {
            if (! in_array($chave, Empresa::chavesPermissoes(), true)) {
                $erros["permissoes.$chave"] = 'Permissão inválida.';
            } elseif (! is_bool($valor)) {
                $erros["permissoes.$chave"] = 'O valor tem de ser verdadeiro ou falso.';
            }
        }
        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }

        return $permissoes;
    }
}
