<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecusarPedidoRequest;
use App\Http\Requests\StorePedidoRequest;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Pedido::where('empresa_id', $user->empresa_id)->latest('id');

        if ($user->isAdmin()) {
            $query->with('user:id,nome');
        } else {
            $query->where('user_id', $user->id);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->query('estado'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(StorePedidoRequest $request): JsonResponse
    {
        $user = $request->user();
        $dados = $request->validated();

        $sobrepoe = Pedido::where('user_id', $user->id)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->where('data_inicio', '<=', $dados['data_fim'])
            ->where('data_fim', '>=', $dados['data_inicio'])
            ->exists();

        $pedido = Pedido::create([...$dados, 'user_id' => $user->id, 'empresa_id' => $user->empresa_id]);

        $resposta = ['data' => $pedido->refresh()];
        if ($sobrepoe) {
            $resposta['avisos'] = ['As datas sobrepoem-se a outro pedido seu.'];
        }

        return response()->json($resposta, 201);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, ['estado' => 'aprovado']);
    }

    public function recusar(RecusarPedidoRequest $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, ['estado' => 'recusado', 'motivo_recusa' => $request->validated('motivo_recusa')]);
    }

    private function decidir(Request $request, int $id, array $campos): JsonResponse
    {
        $user = $request->user();
        // 404 para pedidos de outra empresa (nao revela existencia).
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->findOrFail($id);

        abort_if($pedido->estado !== 'pendente', 409, 'O pedido ja foi decidido.');

        $pedido->update([...$campos, 'decidido_por' => $user->id, 'decidido_em' => now()]);

        return response()->json(['data' => $pedido->refresh()]);
    }
}
