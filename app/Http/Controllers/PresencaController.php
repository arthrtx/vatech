<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePresencaAtrasadaRequest;
use App\Models\Presenca;
use App\Models\User;
use App\Services\RegistoAtividade;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PresencaController extends Controller
{
    public function hoje(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->doDia($request)?->load(Presenca::RELACOES)->toContrato()]);
    }

    public function entrada(Request $request): JsonResponse
    {
        $presenca = $this->sobBloqueio($request, function () use ($request) {
            abort_if($this->aberta($request), 422, 'Já tem uma entrada aberta. Marque primeiro a saída.');

            return Presenca::create(['user_id' => $request->user()->id, 'data' => $this->diaLocal(), 'entrada' => now()]);
        });

        RegistoAtividade::registar('presenca', "{$request->user()->nome} marcou a entrada", $request->user());

        return response()->json(['data' => $presenca->load(Presenca::RELACOES)->toContrato()], 201);
    }

    public function saida(Request $request): JsonResponse
    {
        $presenca = $this->sobBloqueio($request, function () use ($request) {
            $aberta = $this->aberta($request);
            abort_if(! $aberta, 422, 'Marque primeiro a entrada.');
            $aberta->update(['saida' => now()]);

            return $aberta;
        });

        RegistoAtividade::registar('presenca', "{$request->user()->nome} marcou a saída", $request->user());

        return response()->json(['data' => $presenca->load(Presenca::RELACOES)->toContrato()]);
    }

    public function atrasada(StorePresencaAtrasadaRequest $request): JsonResponse
    {
        $presenca = Presenca::create([
            'user_id' => $request->user()->id,
            'data' => $request->input('data'),
            'entrada' => $request->instante('entrada'),
            'saida' => $request->instante('saida'),
            'atrasada' => true,
        ]);

        RegistoAtividade::registar('presenca', "{$request->user()->nome} registou presença em atraso de ".Carbon::parse($request->input('data'))->format('d/m'), $request->user());

        return response()->json(['data' => $presenca->load(Presenca::RELACOES)->toContrato()], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = Presenca::with(Presenca::RELACOES)->orderByDesc('data')->orderByDesc('entrada')->orderByDesc('id');

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

    /** O período aberto (de um dia anterior, se o turno atravessou a meia-noite) ou o último do dia; o ecrã decide entre entrada e saída. */
    private function doDia(Request $request): ?Presenca
    {
        return $this->aberta($request)
            ?? Presenca::where('user_id', $request->user()->id)->where('data', $this->diaLocal())
                ->orderByDesc('entrada')->orderByDesc('id')->first();
    }

    /** O período aberto mais recente da pessoa, de qualquer dia: um turno pode atravessar a meia-noite. */
    private function aberta(Request $request): ?Presenca
    {
        return Presenca::where('user_id', $request->user()->id)->whereNull('saida')
            ->orderByDesc('entrada')->orderByDesc('id')->first();
    }

    /** Transação com a linha da pessoa trancada: dois cliques em simultâneo não criam dois períodos abertos. */
    private function sobBloqueio(Request $request, callable $fazer): Presenca
    {
        return DB::transaction(function () use ($request, $fazer) {
            User::whereKey($request->user()->id)->lockForUpdate()->first();

            return $fazer();
        });
    }

    // O dia da presença é o dia em Lisboa (o servidor corre em UTC), igual ao que o utilizador vê.
    private function diaLocal(): string
    {
        return now('Europe/Lisbon')->toDateString();
    }
}
