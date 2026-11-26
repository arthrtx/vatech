<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DefinicoesConviteController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->resposta(Empresa::findOrFail($request->user()->empresa_id));
    }

    public function update(Request $request): JsonResponse
    {
        $dados = $request->validate(['texto' => ['nullable', 'string', 'max:1000']]);

        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        $texto = trim($dados['texto'] ?? '');
        $empresa->update(['texto_convite' => $texto === '' ? null : $texto]);
        RegistoAtividade::registar('definicoes', "{$request->user()->nome} alterou o texto do convite", $request->user());

        return $this->resposta($empresa);
    }

    private function resposta(Empresa $empresa): JsonResponse
    {
        return response()->json(['data' => [
            'texto' => $empresa->textoConvite(),
            'predefinido' => Empresa::TEXTO_CONVITE_PREDEFINIDO,
        ]]);
    }
}
