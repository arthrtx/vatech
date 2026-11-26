<?php

namespace App\Http\Controllers;

use App\Models\Ponte;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PonteController extends Controller
{
    /** Todos os papéis da empresa veem as pontes; `de` e `ate` (AAAA-MM-DD) limitam ao intervalo. */
    public function index(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:de'],
        ]);

        $query = Ponte::where('empresa_id', $request->user()->empresa_id)->orderBy('data_inicio')->orderBy('id');
        if (! empty($dados['de'])) {
            $query->where('data_fim', '>=', $dados['de']);
        }
        if (! empty($dados['ate'])) {
            $query->where('data_inicio', '<=', $dados['ate']);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:80'],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
        ], [
            'nome.required' => 'Indique o nome da ponte.',
            'data_fim.after_or_equal' => 'A data final não pode ser anterior à inicial.',
        ]);

        $ponte = Ponte::create([...$dados, 'empresa_id' => $request->user()->empresa_id]);
        RegistoAtividade::registar('ponte', "{$request->user()->nome} criou a ponte {$ponte->nome} ({$this->intervalo($ponte->data_inicio, $ponte->data_fim)})", $request->user());

        return response()->json(['data' => $ponte->refresh()], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        // 404 para pontes de outra empresa (não revela existência).
        $ponte = Ponte::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $ponte->delete();
        RegistoAtividade::registar('ponte', "{$request->user()->nome} apagou a ponte {$ponte->nome}", $request->user());

        return response()->json(null, 204);
    }

    private function intervalo($inicio, $fim): string
    {
        return $inicio->eq($fim) ? $inicio->format('d/m') : $inicio->format('d/m').' a '.$fim->format('d/m');
    }
}
