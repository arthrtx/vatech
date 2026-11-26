<?php

namespace App\Http\Controllers;

use App\Models\RegistoAtividade;
use App\Services\RegistoAtividade as Registar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoricoController extends Controller
{
    private const POR_PAGINA = 25;

    public function index(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'tipo' => ['nullable', 'string', 'in:'.implode(',', RegistoAtividade::TIPOS)],
            'q' => ['nullable', 'string', 'max:100'],
            'pagina' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = RegistoAtividade::with('actor:id,nome', 'alvo:id,nome')
            ->where('empresa_id', $request->user()->empresa_id)
            ->orderByDesc('created_at')->orderByDesc('id');

        if (! empty($dados['tipo'])) {
            $query->where('tipo', $dados['tipo']);
        }
        if (! empty($dados['q'])) {
            $q = '%'.addcslashes($dados['q'], '%_\\').'%';
            $query->where(fn ($w) => $w->where('descricao', 'like', $q)
                ->orWhereHas('actor', fn ($a) => $a->where('nome', 'like', $q))
                ->orWhereHas('alvo', fn ($a) => $a->where('nome', 'like', $q)));
        }

        $pagina = $query->paginate(self::POR_PAGINA, ['*'], 'pagina', $dados['pagina'] ?? 1);

        return response()->json([
            'data' => $pagina->getCollection()->map->toContrato()->values(),
            'meta' => ['pagina_atual' => $pagina->currentPage(), 'ultima_pagina' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** Apaga todo o histórico da empresa do admin e deixa uma única linha de rasto. */
    public function destroy(Request $request): JsonResponse
    {
        $admin = $request->user();
        $apagados = RegistoAtividade::where('empresa_id', $admin->empresa_id)->delete();
        Registar::registar('definicoes', "{$admin->nome} apagou o histórico ({$apagados} registos)", $admin);

        return response()->json(['data' => ['apagados' => $apagados]]);
    }
}
