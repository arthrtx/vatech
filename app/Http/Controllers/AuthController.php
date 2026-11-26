<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\UpdatePerfilRequest;
use App\Models\User;
use App\Services\RegistoAtividade;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages(['email' => ['Credenciais inválidas.']]);
        }

        if ($user->estado_conta === 'pendente') {
            return response()->json(['message' => 'A sua conta aguarda autorização do administrador.'], 403);
        }

        if ($user->estado_conta === 'recusado') {
            return response()->json(['message' => 'A sua conta não foi autorizada.'], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            throw ValidationException::withMessages(['email' => ['Confirme o seu email para entrar. Enviámos-lhe um link; se não o encontra, peça um novo.']]);
        }

        RegistoAtividade::registar('sessao', "{$user->nome} iniciou sessão", $user);

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $user->toContrato(),
        ]);
    }

    /** Reenvia o link de verificacao. Resposta sempre igual, exista ou nao a conta. */
    public function reenviarVerificacao(Request $request): JsonResponse
    {
        $dados = $request->validate(['email' => ['required', 'email', 'max:255']]);

        $user = User::where('email', $dados['email'])->first();

        if ($user && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'Se a conta existir e estiver por confirmar, enviámos um novo link.']);
    }

    /** Abre-se a partir do email: verifica e devolve o utilizador ao site. */
    public function verificarEmail(Request $request, int $id, string $hash): RedirectResponse
    {
        $login = rtrim((string) config('app.frontend_url'), '/').'/login?verificado=';
        $user = User::find($id);

        if (! $user || ! $request->hasValidSignature() || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect($login.'0');
        }

        $user->markEmailAsVerified();

        return redirect($login.'1');
    }

    /** Pede o email de recuperacao. Resposta sempre igual, exista ou nao a conta (nao revela contas). */
    public function esqueciPassword(Request $request): JsonResponse
    {
        $dados = $request->validate(['email' => ['required', 'email', 'max:255']]);

        Password::sendResetLink(['email' => $dados['email']]);

        return response()->json(['message' => 'Se o email existir, enviámos um link para definir uma nova palavra-passe.']);
    }

    public function redefinirPassword(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $estado = Password::reset($dados, function (User $user, string $password) {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($estado !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => ['O link é inválido ou expirou. Peça um novo.']]);
        }

        return response()->json(['message' => 'Palavra-passe alterada. Já pode entrar.']);
    }

    public function logout(Request $request): JsonResponse
    {
        RegistoAtividade::registar('sessao', "{$request->user()->nome} terminou a sessão", $request->user());
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
        $dados = $request->safe()->only(['nome', 'email', 'data_nascimento', 'estagio_inicio', 'estagio_fim']);
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
