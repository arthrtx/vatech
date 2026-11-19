<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePresencaAtrasadaRequest;
use App\Models\Presenca;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresencaController extends Controller
{
    public function hoje(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->doDia($request)?->load('user:id,nome')->toContrato()]);
    }

    public function entrada(Request $request): JsonResponse
    {
        abort_if($this->doDia($request), 422, 'Já marcou a entrada hoje.');

        try {
            $presenca = Presenca::create(['user_id' => $request->user()->id, 'data' => $this->diaLocal(), 'entrada' => now()]);
        } catch (UniqueConstraintViolationException) {
            // Duplo clique ou pedidos em simultâneo: a segunda marcação não passa.
            abort(422, 'Já marcou a entrada hoje.');
        }

        return response()->json(['data' => $presenca->load('user:id,nome')->toContrato()], 201);
    }

    public function saida(Request $request): JsonResponse
    {
        $presenca = $this->doDia($request);
        abort_if(! $presenca, 422, 'Marque primeiro a entrada.');
        abort_if($presenca->saida, 422, 'Já marcou a saída hoje.');

        $presenca->update(['saida' => now()]);

        return response()->json(['data' => $presenca->load('user:id,nome')->toContrato()]);
    }

    public function atrasada(StorePresencaAtrasadaRequest $request): JsonResponse
    {
        try {
            $presenca = Presenca::create([
                'user_id' => $request->user()->id,
                'data' => $request->input('data'),
                'entrada' => $request->instante('entrada'),
                'saida' => $request->instante('saida'),
                'atrasada' => true,
            ]);
        } catch (UniqueConstraintViolationException) {
            abort(422, 'Já existe presença nesse dia.');
        }

        return response()->json(['data' => $presenca->load('user:id,nome')->toContrato()], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = Presenca::with('user:id,nome')->latest('data')->latest('id');

        if ($user->isAdmin()) {
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

    private function doDia(Request $request): ?Presenca
    {
        return Presenca::where('user_id', $request->user()->id)->where('data', $this->diaLocal())->first();
    }

    // O dia da presença é o dia em Lisboa (o servidor corre em UTC), igual ao que o utilizador vê.
    private function diaLocal(): string
    {
        return now('Europe/Lisbon')->toDateString();
    }
}
