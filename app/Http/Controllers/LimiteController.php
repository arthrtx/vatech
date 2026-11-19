<?php

namespace App\Http\Controllers;

use App\Models\LimitePedido;
use App\Services\LimitesPedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LimiteController extends Controller
{
    public function index(Request $request, LimitesPedidoService $limites): JsonResponse
    {
        return $this->resposta($limites, $request->user());
    }

    public function update(Request $request, LimitesPedidoService $limites): JsonResponse
    {
        $dados = $request->validate([
            'limites' => ['required', 'array'],
            'limites.*.tipo' => ['required', Rule::in(LimitesPedidoService::TIPOS)],
            'limites.*.dias_ano' => ['nullable', 'integer', 'min:0', 'max:366'],
        ]);

        $user = $request->user();
        foreach ($dados['limites'] as $l) {
            LimitePedido::updateOrCreate(
                ['empresa_id' => $user->empresa_id, 'tipo' => $l['tipo']],
                ['dias_ano' => $l['dias_ano'] ?? null],
            );
        }

        return $this->resposta($limites, $user);
    }

    public function feriasResumo(Request $request, LimitesPedidoService $limites): JsonResponse
    {
        return response()->json([
            'data' => $limites->feriasResumo($request->user()),
            'prazo_ferias' => $limites->prazoFerias(),
        ]);
    }

    private function resposta(LimitesPedidoService $limites, $user): JsonResponse
    {
        return response()->json(['data' => $limites->resumo($user), 'prazo_ferias' => $limites->prazoFerias()]);
    }
}
