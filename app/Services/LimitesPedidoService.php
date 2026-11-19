<?php

namespace App\Services;

use App\Models\LimitePedido;
use App\Models\Pedido;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class LimitesPedidoService
{
    public const TIPOS = ['ferias', 'ausencia', 'licenca'];

    /** @return array<int, array{tipo: string, dias_ano: int|null, usados: int}> */
    public function resumo(User $user, ?int $ano = null): array
    {
        $ano ??= now()->year;
        $limites = LimitePedido::where('empresa_id', $user->empresa_id)->pluck('dias_ano', 'tipo');

        return array_map(fn (string $tipo) => [
            'tipo' => $tipo,
            'dias_ano' => isset($limites[$tipo]) ? (int) $limites[$tipo] : null,
            'usados' => $user->isAdmin() ? 0 : $this->usados($user, $tipo, $ano),
        ], self::TIPOS);
    }

    /** Dias de calendario (inclusivos) de pedidos pendentes+aprovados do utilizador nesse ano. */
    public function usados(User $user, string $tipo, int $ano, ?int $excluirPedidoId = null): int
    {
        $pedidos = Pedido::where('user_id', $user->id)
            ->where('tipo', $tipo)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->when($excluirPedidoId, fn ($q) => $q->where('id', '!=', $excluirPedidoId))
            ->whereDate('data_inicio', '<=', "{$ano}-12-31")
            ->whereDate('data_fim', '>=', "{$ano}-01-01")
            ->get(['data_inicio', 'data_fim']);

        return (int) $pedidos->sum(fn (Pedido $p) => $this->diasNoAno($p->data_inicio, $p->data_fim, $ano));
    }

    /** Mensagem de erro do primeiro ano que excede o limite, ou null. */
    public function excedido(User $user, string $tipo, string $inicio, string $fim, ?int $excluirPedidoId = null): ?string
    {
        $limite = LimitePedido::where('empresa_id', $user->empresa_id)->where('tipo', $tipo)->value('dias_ano');
        if ($limite === null) {
            return null;
        }

        $de = CarbonImmutable::parse($inicio);
        $ate = CarbonImmutable::parse($fim);
        for ($ano = $de->year; $ano <= $ate->year; $ano++) {
            $usados = $this->usados($user, $tipo, $ano, $excluirPedidoId);
            if ($usados + $this->diasNoAno($de, $ate, $ano) > $limite) {
                $restantes = max(0, $limite - $usados);

                return "Excede o limite de {$limite} dias de {$tipo} em {$ano}. Restam {$restantes}.";
            }
        }

        return null;
    }

    private function diasNoAno(CarbonInterface $inicio, CarbonInterface $fim, int $ano): int
    {
        $de = CarbonImmutable::parse($inicio)->startOfDay()->max("{$ano}-01-01");
        $ate = CarbonImmutable::parse($fim)->startOfDay()->min("{$ano}-12-31");

        return max(0, (int) $de->diffInDays($ate) + 1);
    }
}
