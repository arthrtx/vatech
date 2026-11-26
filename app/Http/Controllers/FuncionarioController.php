<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncionarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::with('tipo')->where('empresa_id', $request->user()->empresa_id)->orderBy('nome')->get();

        return response()->json(['data' => $users->map(fn (User $u) => $u->toContrato() + ['tipo_id' => $u->tipo_id, 'tipo_nome' => $u->tipo?->nome])]);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, 'aprovado');
    }

    public function recusar(Request $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, 'recusado');
    }

    private function decidir(Request $request, int $id, string $estado): JsonResponse
    {
        abort_if($id === $request->user()->id, 422, 'Não pode alterar a sua própria conta.');

        $user = User::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $user->forceFill(['estado_conta' => $estado, 'aprovado_em' => now(), 'aprovado_por' => $request->user()->id])->save();

        if ($estado === 'recusado') {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $user->toContrato()]);
    }
}
