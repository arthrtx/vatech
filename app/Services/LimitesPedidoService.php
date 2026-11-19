<?php

namespace App\Services;

use App\Models\LimitePedido;
use App\Models\Pedido;
use App\Models\User;
use App\Support\LimiteFerias;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class LimitesPedidoService
{
    public const TIPOS = ['ferias', 'ausencia', 'licenca'];

    /** Rotulo legivel de cada tipo, para mensagens ao utilizador. */
    public const ROTULOS = ['ferias' => 'férias', 'ausencia' => 'ausência', 'licenca' => 'licença'];

    public const ANO_INICIO_CUMULO = 2026;

    /** Limite de ferias (dias uteis por ano) quando a empresa nao configurou nenhum. */
    public const FERIAS_DIAS_POR_ANO = 22;

    /** Mes-dia limite (ano corrente) para marcar as ferias transitadas. */
    public const PRAZO_FERIAS = '04-30';

    /** @return array<int, array{tipo: string, dias_ano: int|null, transitados: int, usados: int}> */
    public function resumo(User $user, ?int $ano = null): array
    {
        $ano ??= now()->year;

        return array_map(fn (string $tipo) => [
            'tipo' => $tipo,
            'dias_ano' => $this->limiteDias($user, $tipo),
            'transitados' => $user->isAdmin() ? 0 : $this->transitados($user, $tipo, $ano),
            'usados' => $user->isAdmin() ? 0 : $this->usados($user, $tipo, $ano),
        ], self::TIPOS);
    }

    public function prazoFerias(?int $ano = null): string
    {
        return ($ano ?? now()->year).'-'.self::PRAZO_FERIAS;
    }

    /**
     * Ferias nao gozadas dos anos anteriores a $ano (desde ANO_INICIO_CUMULO): so aprovadas contam.
     * Apenas o tipo `ferias` acumula; sem limite definido nao ha cumulo.
     */
    public function transitados(User $user, string $tipo, int $ano, ?int $limite = null): int
    {
        if ($tipo !== 'ferias') {
            return 0;
        }
        $limite ??= $this->limiteDias($user, $tipo);
        if ($limite === null) {
            return 0;
        }

        $total = 0;
        for ($a = self::ANO_INICIO_CUMULO; $a < $ano; $a++) {
            $total += max(0, $limite - $this->usados($user, $tipo, $a, null, ['aprovado']));
        }

        return $total;
    }

    /** Utilizadores nao-admin da empresa do admin, com o cumulo e as ferias por marcar. */
    public function feriasResumo(User $admin): array
    {
        $ano = now()->year;
        $limite = $this->limiteDias($admin, 'ferias');

        return User::where('empresa_id', $admin->empresa_id)
            ->where('papel', '!=', 'admin')
            ->orderBy('nome')
            ->get()
            ->map(function (User $u) use ($limite, $ano) {
                $transitados = $this->transitados($u, 'ferias', $ano, $limite);
                $usados = $this->usados($u, 'ferias', $ano);

                return [
                    'user_id' => $u->id,
                    'nome' => $u->nome,
                    'dias_ano' => $limite,
                    'transitados' => $transitados,
                    'usados' => $usados,
                    'por_marcar' => $limite === null ? 0 : max(0, $limite + $transitados - $usados),
                ];
            })->all();
    }

    private function limiteDias(User $user, string $tipo): ?int
    {
        $linha = LimitePedido::where('empresa_id', $user->empresa_id)->where('tipo', $tipo)->first();
        if ($linha === null) {
            return $tipo === 'ferias' ? self::FERIAS_DIAS_POR_ANO : null;
        }

        return $linha->dias_ano === null ? null : (int) $linha->dias_ano;
    }

    /**
     * Dias uteis (seg-sex, sem feriados nacionais) de pedidos do utilizador nesse ano (por omissao pendentes+aprovados).
     *
     * @param  array<int, string>  $estados
     */
    public function usados(User $user, string $tipo, int $ano, ?int $excluirPedidoId = null, array $estados = ['pendente', 'aprovado']): int
    {
        $pedidos = Pedido::where('user_id', $user->id)
            ->where('tipo', $tipo)
            ->whereIn('estado', $estados)
            ->when($excluirPedidoId, fn ($q) => $q->where('id', '!=', $excluirPedidoId))
            ->whereDate('data_inicio', '<=', "{$ano}-12-31")
            ->whereDate('data_fim', '>=', "{$ano}-01-01")
            ->get(['data_inicio', 'data_fim']);

        return (int) $pedidos->sum(fn (Pedido $p) => $this->diasNoAno($p->data_inicio, $p->data_fim, $ano));
    }

    /** Mensagem de erro do primeiro ano que excede o limite, ou null. */
    public function excedido(User $user, string $tipo, string $inicio, string $fim, ?int $excluirPedidoId = null): ?string
    {
        $base = $this->limiteDias($user, $tipo);
        if ($base === null) {
            return null;
        }
        $anoActual = now()->year;

        $de = CarbonImmutable::parse($inicio);
        $ate = CarbonImmutable::parse($fim);
        for ($ano = $de->year; $ano <= $ate->year; $ano++) {
            // Os transitados so valem no ano corrente.
            $limite = $ano === $anoActual ? $base + $this->transitados($user, $tipo, $ano, $base) : $base;
            $usados = $this->usados($user, $tipo, $ano, $excluirPedidoId);
            if ($usados + $this->diasNoAno($de, $ate, $ano) > $limite) {
                $restantes = max(0, $limite - $usados);

                $rotulo = self::ROTULOS[$tipo] ?? $tipo;

                return "Excede o limite de {$limite} dias úteis de {$rotulo} em {$ano}. Restam {$restantes}.";
            }
        }

        return null;
    }

    private function diasNoAno(CarbonInterface $inicio, CarbonInterface $fim, int $ano): int
    {
        return LimiteFerias::diasUteis(CarbonImmutable::parse($inicio), CarbonImmutable::parse($fim), $ano);
    }
}
