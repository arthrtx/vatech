<?php

namespace App\Http\Controllers;

use App\Services\LimitesPedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LimiteController extends Controller
{
    public function index(Request $request, LimitesPedidoService $limites): JsonResponse
    {
        return $this->resposta($limites, $request->user());
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
