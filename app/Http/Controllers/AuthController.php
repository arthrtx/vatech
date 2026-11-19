<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\UpdatePerfilRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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

    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'avatar.required' => 'Escolha uma imagem.',
            'avatar.image' => 'O ficheiro tem de ser uma imagem.',
            'avatar.mimes' => 'Use uma imagem JPG, PNG ou WebP.',
            'avatar.max' => 'A imagem não pode ter mais de 2 MB.',
        ]);

        $user = $request->user();
        $antigo = $user->avatar_path;
        $user->update(['avatar_path' => $request->file('avatar')->store('avatars', 'public')]);

        if ($antigo) {
            Storage::disk('public')->delete($antigo);
        }

        return response()->json(['user' => $user->fresh()->toContrato()]);
    }

    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return response()->json(['user' => $user->fresh()->toContrato()]);
    }
}
