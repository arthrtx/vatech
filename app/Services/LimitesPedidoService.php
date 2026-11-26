<?php

namespace App\Services;

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

    /** Direito anual de ferias (dias uteis). Fixo: a empresa ja nao o configura (D12). */
    public const FERIAS_DIAS_POR_ANO = 22;

    /** Maximo de dias uteis de ferias que se podem pedir num ano; os que passam de 22 sao excedente. */
    public const FERIAS_DIAS_MAXIMO = 25;

    /** Mes-dia limite (ano corrente) para marcar as ferias transitadas. */
    public const PRAZO_FERIAS = '04-30';

    /** @return array<int, array{tipo: string, dias_ano: int|null, dias_max: int|null, transitados: int, usados: int}> */
    public function resumo(User $user, ?int $ano = null): array
    {
        $ano ??= now()->year;

        return array_map(fn (string $tipo) => [
            'tipo' => $tipo,
            'dias_ano' => $this->limiteDias($tipo),
            'dias_max' => $this->maximoDias($tipo),
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
     * Apenas o tipo `ferias` acumula, sobre o direito de 22 dias.
     */
    public function transitados(User $user, string $tipo, int $ano): int
    {
        $limite = $this->limiteDias($tipo);
        if ($tipo !== 'ferias' || $limite === null) {
            return 0;
        }

        $total = 0;
        for ($a = self::ANO_INICIO_CUMULO; $a < $ano; $a++) {
            $total += max(0, $limite - $this->usados($user, $tipo, $a, null, ['aprovado']));
        }

        return $total;
    }

    /** Funcionarios da empresa do admin, com o cumulo e as ferias por marcar. Estagiarios nao tiram ferias. */
    public function feriasResumo(User $admin): array
    {
        $ano = now()->year;
        $limite = self::FERIAS_DIAS_POR_ANO;

        return User::where('empresa_id', $admin->empresa_id)
            ->where('papel', 'funcionario')
            ->orderBy('nome')
            ->get()
            ->map(function (User $u) use ($limite, $ano) {
                $transitados = $this->transitados($u, 'ferias', $ano);
                $usados = $this->usados($u, 'ferias', $ano);

                return [
                    'user_id' => $u->id,
                    'nome' => $u->nome,
                    'dias_ano' => $limite,
                    'dias_max' => self::FERIAS_DIAS_MAXIMO,
                    'transitados' => $transitados,
                    'usados' => $usados,
                    'por_marcar' => max(0, $limite + $transitados - $usados),
                ];
            })->all();
    }

    /** Direito anual: 22 dias uteis de ferias; ausencia e licenca nao tem limite. A tabela limites_pedido e ignorada (D12). */
    private function limiteDias(string $tipo): ?int
    {
        return $tipo === 'ferias' ? self::FERIAS_DIAS_POR_ANO : null;
    }

    /** Maximo pedivel por ano: 25 dias uteis de ferias; os outros tipos nao tem limite. */
    private function maximoDias(string $tipo): ?int
    {
        return $tipo === 'ferias' ? self::FERIAS_DIAS_MAXIMO : null;
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

    /** Mensagem de erro do primeiro ano que passa do maximo (25 dias de ferias), ou null. */
    public function excedido(User $user, string $tipo, string $inicio, string $fim, ?int $excluirPedidoId = null): ?string
    {
        $limite = $this->maximoDias($tipo);
        if ($limite === null) {
            return null;
        }

        $de = CarbonImmutable::parse($inicio);
        $ate = CarbonImmutable::parse($fim);
        for ($ano = $de->year; $ano <= $ate->year; $ano++) {
            $usados = $this->usados($user, $tipo, $ano, $excluirPedidoId);
            if ($usados + $this->diasNoAno($de, $ate, $ano) > $limite) {
                $restantes = max(0, $limite - $usados);
                $rotulo = self::ROTULOS[$tipo] ?? $tipo;

                return "Excede o limite de {$limite} dias úteis de {$rotulo} em {$ano}. Restam {$restantes}.";
            }
        }

        return null;
    }

    /**
     * Dias uteis do pedido de ferias acima dos 22 acumulados no ano. Ordena por data_inicio (depois id) os pedidos
     * pendentes+aprovados do mesmo utilizador; os dias que ultrapassam 22 contando por essa ordem sao o excedente.
     * Soma os anos que o pedido atravessa. Outros tipos, recusados e cancelados: 0.
     */
    public function diasExcedentes(Pedido $pedido): int
    {
        if ($pedido->tipo !== 'ferias' || ! in_array($pedido->estado, ['pendente', 'aprovado'], true)) {
            return 0;
        }

        $inicio = CarbonImmutable::parse($pedido->data_inicio);
        $fim = CarbonImmutable::parse($pedido->data_fim);
        $total = 0;
        for ($ano = $inicio->year; $ano <= $fim->year; $ano++) {
            $acumulado = 0;
            $ordenados = Pedido::where('user_id', $pedido->user_id)
                ->where('tipo', 'ferias')
                ->whereIn('estado', ['pendente', 'aprovado'])
                ->whereDate('data_inicio', '<=', "{$ano}-12-31")
                ->whereDate('data_fim', '>=', "{$ano}-01-01")
                ->orderBy('data_inicio')->orderBy('id')
                ->get(['id', 'data_inicio', 'data_fim']);
            foreach ($ordenados as $p) {
                $dias = $this->diasNoAno($p->data_inicio, $p->data_fim, $ano);
                if ($p->id === $pedido->id) {
                    $total += max(0, min($dias, $acumulado + $dias - self::FERIAS_DIAS_POR_ANO));
                    break;
                }
                $acumulado += $dias;
            }
        }

        return $total;
    }

    private function diasNoAno(CarbonInterface $inicio, CarbonInterface $fim, int $ano): int
    {
        return LimiteFerias::diasUteis(CarbonImmutable::parse($inicio), CarbonImmutable::parse($fim), $ano);
    }
}
