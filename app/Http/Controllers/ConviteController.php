<?php

namespace App\Http\Controllers;

use App\Models\Convite;
use App\Models\Empresa;
use App\Models\Tipo;
use App\Models\User;
use App\Notifications\ConviteNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConviteController extends Controller
{
    // --- Admin ---

    public function index(Request $request): JsonResponse
    {
        $convites = Convite::validos()->with('tipo')->where('empresa_id', $request->user()->empresa_id)->orderByDesc('id')->get();

        return response()->json(['data' => $convites->map->toContrato()]);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'papel' => ['sometimes', Rule::in(['funcionario', 'estagiario'])],
            'tipo_id' => ['sometimes', 'nullable', 'integer'],
            // O cargo é definido só pelo admin (quem tem a permissão delegada de convidar não o define).
            'cargo' => [Rule::prohibitedIf(! $request->user()->isAdmin()), 'sometimes', 'nullable', Rule::in(array_values(array_diff(User::CARGOS, ['CEO'])))],
        ]);

        $admin = $request->user();
        $tipo = isset($dados['tipo_id']) ? Tipo::where('empresa_id', $admin->empresa_id)->find($dados['tipo_id']) : null;
        if (isset($dados['tipo_id']) && ! $tipo) {
            throw ValidationException::withMessages(['tipo_id' => ['Tipo inválido.']]);
        }
        if ($tipo && isset($dados['papel']) && $dados['papel'] !== $tipo->base) {
            throw ValidationException::withMessages(['papel' => ['O papel tem de ser o do tipo escolhido.']]);
        }

        $convite = DB::transaction(function () use ($dados, $admin, $tipo) {
            // Um convite ativo por email: o novo substitui o anterior.
            Convite::validos()->where('empresa_id', $admin->empresa_id)->where('email', $dados['email'])->delete();

            return Convite::create([
                'empresa_id' => $admin->empresa_id,
                'nome' => $dados['nome'],
                'email' => $dados['email'],
                'papel' => $tipo?->base ?? $dados['papel'] ?? 'funcionario',
                'tipo_id' => $tipo?->id,
                'cargo' => $dados['cargo'] ?? null,
                'token' => Str::random(48),
                'convidado_por' => $admin->id,
                'expira_em' => now()->addDays(7),
            ]);
        });

        $this->enviar($convite);

        return response()->json(['data' => $convite->toContrato()], 201);
    }

    public function reenviar(Request $request, int $id): JsonResponse
    {
        $convite = Convite::whereNull('usado_em')->where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (User::withTrashed()->where('email', $convite->email)->exists()) {
            throw ValidationException::withMessages(['email' => ['Já existe uma conta com este email.']]);
        }

        $convite->update(['token' => Str::random(48), 'expira_em' => now()->addDays(7)]);
        $this->enviar($convite);

        return response()->json(['data' => $convite->toContrato()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Convite::whereNull('usado_em')->where('empresa_id', $request->user()->empresa_id)->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    // --- Público ---

    public function mostrar(string $token): JsonResponse
    {
        $convite = Convite::validos()->where('token', $token)->firstOrFail();

        return response()->json(['data' => [
            'nome' => $convite->nome,
            'email' => $convite->email,
            'texto' => Empresa::find($convite->empresa_id)?->textoConvite() ?? Empresa::TEXTO_CONVITE_PREDEFINIDO,
        ]]);
    }

    public function aceitar(Request $request, string $token): JsonResponse
    {
        $dados = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'aceita_termos' => ['required', 'accepted'],
        ]);

        DB::transaction(function () use ($token, $dados) {
            $convite = Convite::validos()->where('token', $token)->lockForUpdate()->firstOrFail();

            if (User::withTrashed()->where('email', $convite->email)->exists()) {
                throw ValidationException::withMessages(['email' => ['Já existe uma conta com este email.']]);
            }

            $user = new User([
                'nome' => $convite->nome,
                'email' => $convite->email,
                'password' => $dados['password'],
                'empresa_id' => $convite->empresa_id,
                'papel' => $convite->papel,
                'tipo_id' => $convite->tipo_id,
                'cargo' => $convite->cargo,
                'termos_aceites_em' => now(),
                'email_verified_at' => now(), // o clique no convite prova o email
            ]);
            $user->forceFill(['estado_conta' => 'pendente'])->save();

            $convite->update(['usado_em' => now()]);
        });

        return response()->json(['message' => 'Conta criada. Aguarde a autorização do administrador para entrar.'], 201);
    }

    private function enviar(Convite $convite): void
    {
        Notification::route('mail', [$convite->email => $convite->nome])->notify(new ConviteNotification($convite));
    }
}
