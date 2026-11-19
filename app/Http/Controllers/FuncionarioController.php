<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFuncionarioRequest;
use App\Http\Requests\UpdateFuncionarioRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncionarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::where('empresa_id', $request->user()->empresa_id)->orderBy('nome')->get();

        return response()->json(['data' => $users->map->toContrato()]);
    }

    public function store(StoreFuncionarioRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->safe()->only(['nome', 'email', 'password', 'papel']),
            'empresa_id' => $request->user()->empresa_id,
        ]);

        return response()->json(['data' => $user->toContrato()], 201);
    }

    public function update(UpdateFuncionarioRequest $request, int $id): JsonResponse
    {
        $user = $this->funcionarioDaEmpresa($request, $id);

        if ($user->is($request->user()) && $request->has('papel') && $request->input('papel') !== $user->papel) {
            return response()->json(['message' => 'Não pode alterar o seu próprio tipo de utilizador.'], 422);
        }

        $user->update($request->validated());

        return response()->json(['data' => $user->toContrato()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $this->funcionarioDaEmpresa($request, $id);

        if ($user->is($request->user())) {
            return response()->json(['message' => 'Não pode apagar o seu próprio utilizador.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(null, 204);
    }

    // 404 para outra empresa ou inexistente (nao revela existencia).
    private function funcionarioDaEmpresa(Request $request, int $id): User
    {
        return User::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
    }
}
