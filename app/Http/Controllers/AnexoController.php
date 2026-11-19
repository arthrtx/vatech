<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnexoController extends Controller
{
    public const MAX_POR_PEDIDO = 5;

    public const MAX_KB = 5120;

    public const TIPOS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];

    /** O funcionario junta ficheiros a um pedido seu enquanto esta pendente. */
    public function store(Request $request, int $id): JsonResponse
    {
        $pedido = $this->pedidoPendenteDoUtilizador($request, $id);

        $request->validate([
            'anexos' => ['required', 'array', 'min:1'],
            'anexos.*' => ['file', 'mimes:'.implode(',', self::TIPOS), 'max:'.self::MAX_KB],
        ], [
            'anexos.required' => 'Escolha pelo menos um ficheiro.',
            'anexos.*.file' => 'Não foi possível ler o ficheiro.',
            'anexos.*.mimes' => 'Tipo de ficheiro não permitido (use imagem, PDF, Word, Excel ou texto).',
            'anexos.*.max' => 'Cada ficheiro pode ter no máximo 5 MB.',
        ]);

        $ficheiros = $request->file('anexos');
        if ($pedido->anexos()->count() + count($ficheiros) > self::MAX_POR_PEDIDO) {
            throw ValidationException::withMessages([
                'anexos' => ['Cada pedido aceita no máximo '.self::MAX_POR_PEDIDO.' ficheiros.'],
            ]);
        }

        $criados = [];
        foreach ($ficheiros as $f) {
            $criados[] = DB::transaction(function () use ($pedido, $f) {
                $anexo = $pedido->anexos()->create([
                    'nome' => $f->getClientOriginalName(),
                    'mime' => $f->getClientMimeType(),
                    'tamanho' => $f->getSize(),
                ]);
                $anexo->conteudo()->create(['conteudo' => $f->get()]);

                return $anexo;
            });
        }

        return response()->json(['data' => $criados], 201);
    }

    public function destroy(Request $request, int $id, int $anexoId): JsonResponse
    {
        $pedido = $this->pedidoPendenteDoUtilizador($request, $id);
        $anexo = $pedido->anexos()->findOrFail($anexoId);

        $anexo->delete();

        return response()->json(null, 204);
    }

    /** Descarga autenticada: o dono do pedido ou um admin da mesma empresa. */
    public function download(Request $request, int $id, int $anexoId): StreamedResponse
    {
        $user = $request->user();
        // 404 para pedidos de outra empresa ou de outro funcionario (nao revela existencia).
        $query = Pedido::where('empresa_id', $user->empresa_id);
        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }
        $anexo = $query->findOrFail($id)->anexos()->findOrFail($anexoId);
        $conteudo = $anexo->conteudo()->first();
        // Anexos antigos cujo ficheiro se perdeu com o disco: sem bytes, 404.
        abort_unless($conteudo, 404);

        return response()->streamDownload(fn () => print ($conteudo->conteudo), $anexo->nome, ['Content-Type' => $anexo->mime]);
    }

    private function pedidoPendenteDoUtilizador(Request $request, int $id): Pedido
    {
        $user = $request->user();
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->where('user_id', $user->id)->findOrFail($id);

        abort_if($pedido->estado !== 'pendente', 409, 'So e possivel alterar pedidos pendentes.');

        return $pedido;
    }
}
