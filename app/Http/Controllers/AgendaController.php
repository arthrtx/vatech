<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgendaRequest;
use App\Models\Pedido;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class AgendaController extends Controller
{
    /**
     * Aniversarios da empresa no intervalo. So expoe nome e o dia (nunca o ano de nascimento).
     * Quem nasceu a 29 de fevereiro faz anos a 28 nos anos nao bissextos.
     */
    public function aniversarios(AgendaRequest $request): JsonResponse
    {
        $de = CarbonImmutable::parse($request->validated('de'));
        $ate = CarbonImmutable::parse($request->validated('ate'));

        $data = User::where('empresa_id', $request->user()->empresa_id)
            ->whereNotNull('data_nascimento')
            ->get(['id', 'nome', 'data_nascimento'])
            ->flatMap(function (User $u) use ($de, $ate) {
                $nasc = $u->data_nascimento;

                return collect(range($de->year, $ate->year))
                    ->map(function (int $ano) use ($nasc) {
                        $dia = ($nasc->month === 2 && $nasc->day === 29 && ! CarbonImmutable::create($ano)->isLeapYear()) ? 28 : $nasc->day;

                        return CarbonImmutable::create($ano, $nasc->month, $dia);
                    })
                    ->filter(fn (CarbonImmutable $d) => $d->between($de, $ate))
                    ->map(fn (CarbonImmutable $d) => ['user' => ['id' => $u->id, 'nome' => $u->nome], 'data' => $d->format('Y-m-d')]);
            })
            ->sortBy([['data', 'asc'], ['user.nome', 'asc']])
            ->values();

        return response()->json(['data' => $data]);
    }

    public function index(AgendaRequest $request): JsonResponse
    {
        $user = $request->user();
        $verTodos = $user->temPermissao('aprovar_pedidos');

        $query = Pedido::where('empresa_id', $user->empresa_id)
            ->whereHas('user')
            ->with('user:id,nome')
            ->where('data_inicio', '<=', $request->validated('ate'))
            ->where('data_fim', '>=', $request->validated('de'))
            ->orderBy('data_inicio')
            ->orderBy('id');

        if ($verTodos) {
            $query->whereIn('estado', ['pendente', 'aprovado']);
        } else {
            // Os proprios (pendentes e aprovados) + aprovados dos colegas.
            $query->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('user_id', $user->id)->whereIn('estado', ['pendente', 'aprovado']))
                ->orWhere('estado', 'aprovado'));
        }

        $data = $query->get()->map(fn (Pedido $pedido) => $verTodos || $pedido->user_id === $user->id
            ? $pedido
            : [
                'id' => $pedido->id,
                'user' => ['id' => $pedido->user->id, 'nome' => $pedido->user->nome],
                'tipo' => $pedido->tipo,
                'data_inicio' => $pedido->data_inicio->format('Y-m-d'),
                'data_fim' => $pedido->data_fim->format('Y-m-d'),
                'estado' => $pedido->estado,
                'cor' => $pedido->cor,
            ]);

        return response()->json(['data' => $data]);
    }
}
