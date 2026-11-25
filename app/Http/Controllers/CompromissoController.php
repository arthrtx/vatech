<?php

namespace App\Http\Controllers;

use App\Models\Compromisso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompromissoController extends Controller
{
    /** Os compromissos de quem pede, no intervalo (inclusivo), por dia e hora. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'de' => ['required', 'date_format:Y-m-d'],
            'ate' => ['required', 'date_format:Y-m-d', 'after_or_equal:de'],
        ]);

        $lista = Compromisso::where('user_id', $request->user()->id)
            ->whereBetween('data', [$request->query('de'), $request->query('ate')])
            ->orderBy('data')
            ->orderByRaw('hora_inicio is null desc')
            ->orderBy('hora_inicio')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $lista->map->toContrato()->values()]);
    }

    /** Marca um compromisso para hoje ou para um dia a seguir; dias passados não se marcam. */
    public function store(Request $request): JsonResponse
    {
        $hoje = now('Europe/Lisbon')->toDateString();
        $dados = $request->validate([
            'data' => ['required', 'date_format:Y-m-d', "after_or_equal:$hoje"],
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fim' => ['nullable', 'date_format:H:i', 'required_with:hora_inicio', 'after:hora_inicio'],
            'titulo' => ['required', 'string', 'max:120'],
            'tipo' => ['required', Rule::in(Compromisso::TIPOS)],
            'descricao' => ['nullable', 'string', 'max:2000'],
        ], [
            'data.required' => 'Indique o dia.',
            'data.date_format' => 'Dia inválido.',
            'data.after_or_equal' => 'Só é possível marcar para hoje ou para dias seguintes.',
            'hora_inicio.date_format' => 'Hora de início inválida.',
            'hora_fim.date_format' => 'Hora de fim inválida.',
            'hora_fim.required_with' => 'Indique também a hora de fim.',
            'hora_fim.after' => 'A hora de fim tem de ser depois da hora de início.',
            'titulo.required' => 'Indique o título.',
            'titulo.max' => 'O título pode ter até 120 caracteres.',
            'tipo.required' => 'Escolha o tipo.',
            'tipo.in' => 'Tipo inválido.',
            'descricao.max' => 'A descrição pode ter até 2000 caracteres.',
        ]);

        $compromisso = Compromisso::create(['user_id' => $request->user()->id, ...$dados]);

        return response()->json(['data' => $compromisso->toContrato()], 201);
    }

    /** Só o próprio apaga; o de outra pessoa responde 404, como se não existisse. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        Compromisso::where('user_id', $request->user()->id)->findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
