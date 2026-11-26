<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\RegistoAtividade;
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

    /** Apaga uma pessoa da empresa e tudo o que é dela (pedidos, presenças, fichas de RH em cascata). */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $autor = $request->user();
        abort_if($id === $autor->id, 422, 'Não pode apagar a sua própria conta.');

        $user = User::where('empresa_id', $autor->empresa_id)->findOrFail($id);
        abort_if($user->papel === 'admin', 422, 'Não é possível apagar um administrador.');

        // Soft delete: o histórico e os pedidos ficam; só se fecham as sessões.
        $user->tokens()->delete();
        $user->delete();

        RegistoAtividade::registar('conta', "{$autor->nome} apagou a conta de {$user->nome}", $autor);

        return response()->json(null, 204);
    }

    private function decidir(Request $request, int $id, string $estado): JsonResponse
    {
        abort_if($id === $request->user()->id, 422, 'Não pode alterar a sua própria conta.');

        $user = User::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $user->forceFill(['estado_conta' => $estado, 'aprovado_em' => now(), 'aprovado_por' => $request->user()->id])->save();

        if ($estado === 'recusado') {
            $user->tokens()->delete();
        }

        $verbo = $estado === 'aprovado' ? 'aprovou' : 'recusou';
        RegistoAtividade::registar('conta', "{$request->user()->nome} {$verbo} a conta de {$user->nome}", $request->user(), $user);

        return response()->json(['data' => $user->toContrato()]);
    }
}
