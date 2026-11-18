<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFuncionarioRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FuncionarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::where('empresa_id', $request->user()->empresa_id)
            ->where('papel', 'funcionario')->orderBy('nome')->get();

        return response()->json(['data' => $users->map->toContrato()]);
    }

    public function store(StoreFuncionarioRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->safe()->only(['nome', 'email', 'password']),
            'papel' => 'funcionario',
            'empresa_id' => $request->user()->empresa_id,
        ]);

        return response()->json(['data' => $user->toContrato()], 201);
    }
}
