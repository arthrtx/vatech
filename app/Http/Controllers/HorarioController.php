<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\User;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HorarioController extends Controller
{
    private const MENSAGENS = [
        'entrada.date_format' => 'A hora de entrada tem de ser no formato HH:MM.',
        'saida.date_format' => 'A hora de saída tem de ser no formato HH:MM.',
        'almoco_inicio.date_format' => 'A hora de início do almoço tem de ser no formato HH:MM.',
        'entrada.required' => 'Indique a hora de entrada.',
        'saida.required' => 'Indique a hora de saída.',
        'almoco_inicio.required' => 'Indique a hora de início do almoço.',
        'almoco_min.required' => 'Indique a duração do almoço.',
        'almoco_min.integer' => 'A duração do almoço tem de ser um número de minutos.',
        'almoco_min.min' => 'A duração do almoço não pode ser negativa.',
        'almoco_min.max' => 'O almoço pode ter no máximo 240 minutos.',
    ];

    /** O horário da empresa e o efectivo de quem pede. */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('empresa');

        return response()->json(['data' => ['empresa' => $user->empresa->horario(), 'meu' => $user->horario()]]);
    }

    public function update(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'entrada' => ['required', 'date_format:H:i'],
            'saida' => ['required', 'date_format:H:i'],
            'almoco_inicio' => ['required', 'date_format:H:i'],
            'almoco_min' => ['required', 'integer', 'min:0', 'max:240'],
        ], self::MENSAGENS);
        $this->validarHorario($dados['entrada'], $dados['saida'], $dados['almoco_inicio'], $dados['almoco_min']);

        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        $empresa->update([
            'horario_entrada' => $dados['entrada'],
            'horario_saida' => $dados['saida'],
            'almoco_inicio' => $dados['almoco_inicio'],
            'almoco_minutos' => $dados['almoco_min'],
        ]);

        RegistoAtividade::registar('definicoes', "{$request->user()->nome} alterou o horário da empresa", $request->user());

        return response()->json(['data' => $empresa->horario()]);
    }

    public function index(Request $request): JsonResponse
    {
        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        $users = User::where('empresa_id', $empresa->id)->where('estado_conta', 'aprovado')->orderBy('nome')->get();

        return response()->json(['data' => $users->map(fn (User $u) => $this->item($u->setRelation('empresa', $empresa)))->values()]);
    }

    public function updatePessoa(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        $user = User::where('empresa_id', $empresa->id)->findOrFail($id)->setRelation('empresa', $empresa);

        $dados = $request->validate([
            'entrada' => ['nullable', 'date_format:H:i'],
            'saida' => ['nullable', 'date_format:H:i'],
            'almoco_inicio' => ['nullable', 'date_format:H:i'],
            'almoco_min' => ['nullable', 'integer', 'min:0', 'max:240'],
        ], self::MENSAGENS);
        $user->fill([
            'horario_entrada' => $dados['entrada'] ?? null,
            'horario_saida' => $dados['saida'] ?? null,
            'horario_almoco_inicio' => $dados['almoco_inicio'] ?? null,
            'almoco_minutos' => $dados['almoco_min'] ?? null,
        ]);
        $h = $user->horario();
        $this->validarHorario($h['entrada'], $h['saida'], $h['almoco_inicio'], $h['almoco_min']);
        $user->save();
        RegistoAtividade::registar('definicoes', "{$request->user()->nome} alterou o horário de {$user->nome}", $request->user(), $user);

        return response()->json(['data' => $this->item($user)]);
    }

    /** @return array<string,mixed> */
    private function item(User $u): array
    {
        $h = fn (?string $t) => $t ? substr($t, 0, 5) : null;

        return [
            'user_id' => $u->id,
            'nome' => $u->nome,
            'entrada' => $h($u->horario_entrada),
            'saida' => $h($u->horario_saida),
            'almoco_inicio' => $h($u->horario_almoco_inicio),
            'almoco_min' => $u->almoco_minutos,
            'efectivo' => $u->horario(),
        ];
    }

    // O almoço não tem de caber na jornada: quem chega depois dele simplesmente não desconta.
    private function validarHorario(string $entrada, string $saida, string $almocoInicio, int $almocoMin): void
    {
        if ($this->minutos($saida) <= $this->minutos($entrada)) {
            throw ValidationException::withMessages(['saida' => 'A hora de saída tem de ser depois da entrada.']);
        }
        if ($this->minutos($almocoInicio) + $almocoMin > 23 * 60 + 59) {
            throw ValidationException::withMessages(['almoco_min' => 'O almoço não pode passar das 23:59.']);
        }
    }

    private function minutos(string $hhmm): int
    {
        [$h, $m] = explode(':', $hhmm);

        return (int) $h * 60 + (int) $m;
    }
}
