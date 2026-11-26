<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\Presenca;
use App\Models\User;
use App\Services\LimitesPedidoService;
use App\Support\LimiteFerias;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/** Resumo completo de uma pessoa para o RH exportar em PDF (o PDF é gerado no front-end). */
class RhResumoController extends Controller
{
    public const MAX_PEDIDOS = 500;

    public function __invoke(Request $request, LimitesPedidoService $limites, int $userId): JsonResponse
    {
        $user = User::with(['tipo', 'empresa'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->where('estado_conta', 'aprovado')
            ->findOrFail($userId);
        $ano = now()->year;

        return response()->json(['data' => [
            'gerado_em' => now()->toIso8601String(),
            'pessoa' => Arr::except($user->toContrato(), ['empresa_id']),
            'ferias' => $this->ferias($limites, $user, $ano),
            'pedidos' => $this->pedidos($user),
            'presencas' => $this->presencas($user, $ano),
            'infos' => $user->rhInfos()->orderBy('id')->get()->map->toContrato()->values(),
            'ficheiros' => $user->rhFicheiros()->orderBy('id')->get()->map(fn ($f) => [
                'nome' => $f->nome,
                'categoria' => $f->categoria ?? 'outro',
                'categoria_nome' => $f->categoria_nome,
                'tamanho' => (int) $f->tamanho,
                'criado_em' => $f->created_at?->toIso8601String(),
            ])->values(),
        ]]);
    }

    /** Mesma fonte que `GET /ferias-resumo` (LimitesPedidoService): `usados` já inclui as pontes descontadas. */
    private function ferias(LimitesPedidoService $limites, User $user, int $ano): array
    {
        $transitados = $limites->transitados($user, 'ferias', $ano);
        $usados = $limites->usados($user, 'ferias', $ano);

        return [
            'ano' => $ano,
            'dias_ano' => LimitesPedidoService::FERIAS_DIAS_POR_ANO,
            'transitados' => $transitados,
            'usados' => $usados,
            'restantes' => max(0, LimitesPedidoService::FERIAS_DIAS_POR_ANO + $transitados - $usados),
        ];
    }

    private function pedidos(User $user): array
    {
        $pedidos = Pedido::where('user_id', $user->id)
            ->orderByDesc('data_inicio')->orderByDesc('id')
            ->limit(self::MAX_PEDIDOS)
            ->get();
        $decisores = User::whereIn('id', $pedidos->pluck('decidido_por')->filter()->unique())->pluck('nome', 'id');

        return $pedidos->map(fn (Pedido $p) => [
            'id' => $p->id,
            'tipo' => $p->tipo,
            'tipo_rotulo' => Str::ucfirst(LimitesPedidoService::ROTULOS[$p->tipo] ?? $p->tipo),
            'subtipo' => $p->subtipo,
            'estado' => $p->estado,
            'data_inicio' => $p->data_inicio->format('Y-m-d'),
            'data_fim' => $p->data_fim->format('Y-m-d'),
            'hora_inicio' => $p->hora_inicio ? substr($p->hora_inicio, 0, 5) : null,
            'hora_fim' => $p->hora_fim ? substr($p->hora_fim, 0, 5) : null,
            'dias_uteis' => $this->diasUteis($p),
            'motivo' => $p->observacao,
            'motivo_recusa' => $p->motivo_recusa,
            'decidido_por' => $p->decidido_por ? ($decisores[$p->decidido_por] ?? null) : null,
            'decidido_em' => $p->decidido_em?->toIso8601String(),
            'criado_em' => $p->created_at?->toIso8601String(),
        ])->values()->all();
    }

    /** Dias úteis (seg-sex, sem feriados nacionais) do pedido, somando os anos que atravessa. */
    private function diasUteis(Pedido $p): int
    {
        $de = CarbonImmutable::parse($p->data_inicio);
        $ate = CarbonImmutable::parse($p->data_fim);
        $total = 0;
        for ($a = $de->year; $a <= $ate->year; $a++) {
            $total += LimiteFerias::diasUteis($de, $ate, $a);
        }

        return $total;
    }

    /** Dias com registo e horas trabalhadas (descontado o almoço) no ano; períodos sem saída não contam horas. */
    private function presencas(User $user, int $ano): array
    {
        $registos = Presenca::where('user_id', $user->id)
            ->whereDate('data', '>=', "{$ano}-01-01")->whereDate('data', '<=', "{$ano}-12-31")
            ->get();
        $minutos = 0;
        foreach ($registos as $r) {
            if ($r->saida) {
                $r->setRelation('user', $user);
                $minutos += max(0, (int) round($r->entrada->diffInMinutes($r->saida)) - $r->minutosDeAlmoco());
            }
        }

        return [
            'ano' => $ano,
            'dias_com_registo' => $registos->map(fn ($r) => $r->data->format('Y-m-d'))->unique()->count(),
            'horas_total' => round($minutos / 60, 2),
        ];
    }
}
