<?php

namespace App\Http\Controllers;

use App\Http\Requests\AgendaRequest;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;

class AgendaController extends Controller
{
    public function index(AgendaRequest $request): JsonResponse
    {
        $user = $request->user();

        $query = Pedido::where('empresa_id', $user->empresa_id)
            ->whereHas('user')
            ->with('user:id,nome')
            ->where('data_inicio', '<=', $request->validated('ate'))
            ->where('data_fim', '>=', $request->validated('de'))
            ->orderBy('data_inicio')
            ->orderBy('id');

        if ($user->isAdmin()) {
            $query->whereIn('estado', ['pendente', 'aprovado']);
        } else {
            // Os proprios (pendentes e aprovados) + aprovados dos colegas.
            $query->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('user_id', $user->id)->whereIn('estado', ['pendente', 'aprovado']))
                ->orWhere('estado', 'aprovado'));
        }

        $data = $query->get()->map(fn (Pedido $pedido) => $user->isAdmin() || $pedido->user_id === $user->id
            ? $pedido
            : [
                'id' => $pedido->id,
                'user' => ['id' => $pedido->user->id, 'nome' => $pedido->user->nome],
                'tipo' => $pedido->tipo,
                'data_inicio' => $pedido->data_inicio->format('Y-m-d'),
                'data_fim' => $pedido->data_fim->format('Y-m-d'),
                'estado' => $pedido->estado,
            ]);

        return response()->json(['data' => $data]);
    }
}
