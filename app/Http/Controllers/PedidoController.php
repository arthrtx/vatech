<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecusarPedidoRequest;
use App\Http\Requests\StorePedidoRequest;
use App\Models\Pedido;
use App\Services\LimitesPedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PedidoController extends Controller
{
    public function __construct(private LimitesPedidoService $limites) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Pedido::where('empresa_id', $user->empresa_id)->whereHas('user')->with('anexos')->latest('id');

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
        $this->garantirLimite($user, $dados);

        $sobrepoe = Pedido::where('user_id', $user->id)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->where('data_inicio', '<=', $dados['data_fim'])
            ->where('data_fim', '>=', $dados['data_inicio'])
            ->exists();

        $pedido = Pedido::create([...$dados, 'user_id' => $user->id, 'empresa_id' => $user->empresa_id]);

        $resposta = ['data' => $pedido->refresh()->load('anexos')];
        if ($sobrepoe) {
            $resposta['avisos'] = ['As datas sobrepõem-se a outro pedido seu.'];
        }

        return response()->json($resposta, 201);
    }

    /** O funcionario edita um pedido seu enquanto esta pendente. */
    public function update(StorePedidoRequest $request, int $id): JsonResponse
    {
        $pedido = $this->pedidoPendenteDoUtilizador($request, $id);
        $dados = $request->validated();
        $this->garantirLimite($request->user(), $dados, $pedido->id);

        $sobrepoe = Pedido::where('user_id', $pedido->user_id)
            ->where('id', '!=', $pedido->id)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->where('data_inicio', '<=', $dados['data_fim'])
            ->where('data_fim', '>=', $dados['data_inicio'])
            ->exists();

        // Campos opcionais em falta limpam-se (ex.: mudar de ausencia para ferias remove o subtipo).
        $pedido->update([...$dados, 'subtipo' => $dados['subtipo'] ?? null, 'observacao' => $dados['observacao'] ?? null, 'urgente' => $dados['urgente'] ?? false]);

        $resposta = ['data' => $pedido->refresh()->load('anexos')];
        if ($sobrepoe) {
            $resposta['avisos'] = ['As datas sobrepõem-se a outro pedido seu.'];
        }

        return response()->json($resposta);
    }

    private function garantirLimite($user, array $dados, ?int $excluirId = null): void
    {
        $erro = $this->limites->excedido($user, $dados['tipo'], $dados['data_inicio'], $dados['data_fim'], $excluirId);
        if ($erro !== null) {
            throw ValidationException::withMessages(['data_fim' => $erro]);
        }
    }

    /** O funcionario apaga um pedido seu enquanto esta pendente. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $pedido = $this->pedidoPendenteDoUtilizador($request, $id);
        // Os anexos (e os seus bytes) saem em cascata.
        $pedido->delete();

        return response()->json(null, 204);
    }

    private function pedidoPendenteDoUtilizador(Request $request, int $id): Pedido
    {
        $user = $request->user();
        // 404 para pedidos de outros utilizadores ou empresas (nao revela existencia).
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->where('user_id', $user->id)->findOrFail($id);

        abort_if($pedido->estado !== 'pendente', 409, 'Só é possível alterar pedidos pendentes.');

        return $pedido;
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
        // 404 para pedidos de outra empresa ou de funcionarios apagados (nao revela existencia).
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->whereHas('user')->findOrFail($id);

        abort_if($pedido->estado !== 'pendente', 409, 'O pedido já foi decidido.');

        $pedido->update([...$campos, 'decidido_por' => $user->id, 'decidido_em' => now()]);

        return response()->json(['data' => $pedido->refresh()]);
    }
}
