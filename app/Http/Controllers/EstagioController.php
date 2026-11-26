<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgendaRequest;
use App\Models\User;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EstagioController extends Controller
{
    /** Admin: define o período de estágio e a instituição de ensino de um estagiário da empresa. */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::where('empresa_id', $request->user()->empresa_id)
            ->where('estado_conta', 'aprovado')
            ->findOrFail($id);

        if ($user->papel !== 'estagiario') {
            throw ValidationException::withMessages(['papel' => ['Só estagiários têm período de estágio.']]);
        }

        $dados = $request->validate([
            'estagio_inicio' => ['present', 'nullable', 'date_format:Y-m-d'],
            'estagio_fim' => ['present', 'nullable', 'date_format:Y-m-d', 'after_or_equal:estagio_inicio'],
            'instituicao_ensino' => ['present', 'nullable', 'string', 'max:150'],
        ], [
            'estagio_inicio.date_format' => 'A data de início tem de estar no formato AAAA-MM-DD.',
            'estagio_fim.date_format' => 'A data de fim tem de estar no formato AAAA-MM-DD.',
            'estagio_fim.after_or_equal' => 'A data de fim não pode ser anterior à data de início.',
            'instituicao_ensino.max' => 'A instituição de ensino não pode ter mais de 150 caracteres.',
        ]);

        $dados['instituicao_ensino'] = filled($dados['instituicao_ensino']) ? trim($dados['instituicao_ensino']) : null;
        $user->forceFill($dados)->save();
        // Nunca a instituição de ensino: só se diz que o período mudou.
        RegistoAtividade::registar('estagio', "{$request->user()->nome} atualizou o período de estágio de {$user->nome}", $request->user(), $user);

        return response()->json(['data' => $user->fresh()->toContrato()]);
    }

    /** Estagiários da empresa cujo período se sobrepõe ao intervalo. Nunca expõe a instituição. */
    public function index(AgendaRequest $request): JsonResponse
    {
        $de = $request->validated('de');
        $ate = $request->validated('ate');

        $data = User::where('empresa_id', $request->user()->empresa_id)
            ->where('papel', 'estagiario')
            ->where('estado_conta', 'aprovado')
            ->where(fn ($q) => $q->whereNotNull('estagio_inicio')->orWhereNotNull('estagio_fim'))
            ->where(fn ($q) => $q->whereNull('estagio_inicio')->orWhere('estagio_inicio', '<=', $ate))
            ->where(fn ($q) => $q->whereNull('estagio_fim')->orWhere('estagio_fim', '>=', $de))
            ->orderBy('nome')
            ->orderBy('id')
            ->get(['id', 'nome', 'estagio_inicio', 'estagio_fim'])
            ->map(fn (User $u) => [
                'user' => ['id' => $u->id, 'nome' => $u->nome],
                'inicio' => $u->estagio_inicio?->format('Y-m-d'),
                'fim' => $u->estagio_fim?->format('Y-m-d'),
            ]);

        return response()->json(['data' => $data]);
    }
}
