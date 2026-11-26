<?php

namespace App\Http\Controllers;

use App\Models\Ocorrencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OcorrenciaController extends Controller
{
    /** O estagiário comunica uma falta ou um atraso, com o motivo e uma descrição. */
    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'data' => ['required', 'date_format:Y-m-d'],
            'tipo' => ['required', Rule::in(Ocorrencia::TIPOS)],
            'motivo' => ['required', Rule::in(Ocorrencia::MOTIVOS)],
            'descricao' => ['required', 'string', 'max:2000'],
        ], [
            'data.required' => 'Indique o dia.',
            'data.date_format' => 'Dia inválido.',
            'tipo.required' => 'Escolha se foi falta ou atraso.',
            'tipo.in' => 'Escolha se foi falta ou atraso.',
            'motivo.required' => 'Escolha o motivo.',
            'motivo.in' => 'Motivo inválido.',
            'descricao.required' => 'Descreva o que aconteceu.',
            'descricao.max' => 'A descrição pode ter até 2000 caracteres.',
        ]);

        $ocorrencia = Ocorrencia::create(['user_id' => $request->user()->id, ...$dados]);

        return response()->json(['data' => $ocorrencia->load('user:id,nome')->toContrato()], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = Ocorrencia::with('user:id,nome')->latest('data')->latest('id');

        if ($user->temPermissao('ver_presencas_empresa')) {
            $query->whereHas('user', fn ($q) => $q->where('empresa_id', $user->empresa_id));
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->query('user_id'));
            }
        } else {
            $query->where('user_id', $user->id);
        }
        if ($request->filled('de')) {
            $query->where('data', '>=', $request->query('de'));
        }
        if ($request->filled('ate')) {
            $query->where('data', '<=', $request->query('ate'));
        }

        return response()->json(['data' => $query->get()->map->toContrato()->values()]);
    }
}
