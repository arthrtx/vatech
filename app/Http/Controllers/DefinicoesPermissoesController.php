<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DefinicoesPermissoesController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->resposta(Empresa::findOrFail($request->user()->empresa_id));
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate(['papeis' => ['required', 'array']]);
        $papeis = $request->input('papeis');

        // Só papéis editáveis e chaves do catálogo, com valores booleanos.
        $erros = [];
        foreach ($papeis as $papel => $valores) {
            if (! in_array($papel, Empresa::PAPEIS_EDITAVEIS, true) || ! is_array($valores)) {
                $erros["papeis.$papel"] = 'Papel inválido.';

                continue;
            }
            foreach ($valores as $chave => $valor) {
                if (! in_array($chave, Empresa::chavesPermissoes(), true)) {
                    $erros["papeis.$papel.$chave"] = 'Permissão inválida.';
                } elseif (! is_bool($valor)) {
                    $erros["papeis.$papel.$chave"] = 'O valor tem de ser verdadeiro ou falso.';
                }
            }
        }
        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }

        // O que não vier fica com o predefinido.
        $guardar = [];
        foreach (Empresa::PAPEIS_EDITAVEIS as $papel) {
            $guardar[$papel] = $papeis[$papel] ?? [];
        }
        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        $empresa->update(['permissoes' => $guardar]);

        return $this->resposta($empresa->refresh());
    }

    private function resposta(Empresa $empresa): JsonResponse
    {
        return response()->json(['data' => [
            'catalogo' => array_map(fn (array $p) => ['chave' => $p[0], 'rotulo' => $p[1], 'grupo' => $p[2]], Empresa::PERMISSOES_CATALOGO),
            'papeis' => $empresa->permissoesPorPapel(),
        ]]);
    }
}
