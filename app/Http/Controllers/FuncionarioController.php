<?php

namespace App\Http\Controllers;

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
}
