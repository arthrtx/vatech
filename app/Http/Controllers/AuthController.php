<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\UpdatePerfilRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages(['email' => ['Credenciais invalidas.']]);
        }

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $user->toContrato(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->toContrato()]);
    }

    public function updateMe(UpdatePerfilRequest $request): JsonResponse
    {
        $user = $request->user();
        $dados = $request->safe()->only(['nome', 'email']);
        $mudaEmail = $dados['email'] !== $user->email;
        $mudaPassword = $request->filled('password');

        if ($mudaEmail || $mudaPassword) {
            if (! Hash::check((string) $request->input('password_atual'), $user->password)) {
                throw ValidationException::withMessages(['password_atual' => ['Palavra-passe atual incorreta.']]);
            }
        }

        if ($mudaPassword) {
            $dados['password'] = $request->string('password')->toString();
        }

        $user->update($dados);

        if ($mudaPassword) {
            $atualId = $user->currentAccessToken()->id ?? null;
            $user->tokens()->when($atualId, fn ($q) => $q->where('id', '!=', $atualId))->delete();
        }

        return response()->json(['user' => $user->fresh()->toContrato()]);
    }
}
