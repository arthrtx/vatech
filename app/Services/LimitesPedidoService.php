<?php

namespace App\Services;

use App\Models\Pedido;
use App\Models\Ponte;
use App\Models\User;
use App\Support\LimiteFerias;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

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

    /** @return array<int, array{tipo: string, dias_ano: int|null, dias_max: int|null, transitados: int, usados: int, pontes: int}> */
    public function resumo(User $user, ?int $ano = null): array
    {
        $ano ??= now()->year;

        return array_map(fn (string $tipo) => [
            'tipo' => $tipo,
            'dias_ano' => $this->limiteDias($tipo),
            'dias_max' => $this->maximoDias($tipo),
            'transitados' => $user->isAdmin() ? 0 : $this->transitados($user, $tipo, $ano),
            'usados' => $user->isAdmin() ? 0 : $this->usados($user, $tipo, $ano),
            'pontes' => $tipo === 'ferias' ? $this->pontesDescontadas($user, $ano) : 0,
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
                    'pontes' => $this->pontesDescontadas($u, $ano),
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
     * Nas ferias de um funcionario somam-se os dias uteis das pontes da empresa, sem contar duas vezes o dia que
     * tambem esta num pedido (D21).
     *
     * @param  array<int, string>  $estados
     */
    public function usados(User $user, string $tipo, int $ano, ?int $excluirPedidoId = null, array $estados = ['pendente', 'aprovado']): int
    {
        $pedidos = $this->pedidosDoAno($user, $tipo, $ano, $excluirPedidoId, $estados);
        $total = (int) $pedidos->sum(fn (Pedido $p) => count($this->diasUteisNoAno($p->data_inicio, $p->data_fim, $ano)));
        if ($tipo === 'ferias') {
            $total += count(array_diff_key($this->diasDePontes($user, $ano), $this->uniao($pedidos, $ano)));
        }

        return $total;
    }

    /** Dias uteis do ano que as pontes da empresa tiram ao saldo de ferias da pessoa e que nenhum pedido seu ja cobre. */
    public function pontesDescontadas(User $user, int $ano): int
    {
        $pontes = $this->diasDePontes($user, $ano);

        return count(array_diff_key($pontes, $this->uniao($this->pedidosDoAno($user, 'ferias', $ano), $ano)));
    }

    /**
     * @param  array<int, string>  $estados
     * @return Collection<int, Pedido>
     */
    private function pedidosDoAno(User $user, string $tipo, int $ano, ?int $excluirPedidoId = null, array $estados = ['pendente', 'aprovado'])
    {
        return Pedido::where('user_id', $user->id)
            ->where('tipo', $tipo)
            ->whereIn('estado', $estados)
            ->when($excluirPedidoId, fn ($q) => $q->where('id', '!=', $excluirPedidoId))
            ->whereDate('data_inicio', '<=', "{$ano}-12-31")
            ->whereDate('data_fim', '>=', "{$ano}-01-01")
            ->get(['data_inicio', 'data_fim']);
    }

    /**
     * Uniao dos dias uteis (chave Y-m-d) dos pedidos no ano.
     *
     * @param  Collection<int, Pedido>  $pedidos
     * @return array<string, true>
     */
    private function uniao($pedidos, int $ano): array
    {
        $dias = [];
        foreach ($pedidos as $p) {
            $dias += $this->diasUteisNoAno($p->data_inicio, $p->data_fim, $ano);
        }

        return $dias;
    }

    /**
     * Dias uteis (chave Y-m-d) das pontes da empresa no ano; so para funcionarios (os que tem direito a ferias).
     *
     * @return array<string, true>
     */
    private function diasDePontes(User $user, int $ano): array
    {
        if ($user->papel !== 'funcionario' || ! $user->empresa_id) {
            return [];
        }

        $dias = [];
        $pontes = Ponte::where('empresa_id', $user->empresa_id)
            ->whereDate('data_inicio', '<=', "{$ano}-12-31")
            ->whereDate('data_fim', '>=', "{$ano}-01-01")
            ->get(['data_inicio', 'data_fim']);
        foreach ($pontes as $ponte) {
            $dias += $this->diasUteisNoAno($ponte->data_inicio, $ponte->data_fim, $ano);
        }

        return $dias;
    }

    /** @return array<string, true> */
    private function diasUteisNoAno(CarbonInterface $inicio, CarbonInterface $fim, int $ano): array
    {
        $feriados = LimiteFerias::feriadosNacionais($ano);
        $dia = CarbonImmutable::parse($inicio)->max(CarbonImmutable::create($ano, 1, 1))->startOfDay();
        $ate = CarbonImmutable::parse($fim)->min(CarbonImmutable::create($ano, 12, 31))->startOfDay();
        $dias = [];
        for (; $dia->lte($ate); $dia = $dia->addDay()) {
            $chave = $dia->format('Y-m-d');
            if ($dia->dayOfWeekIso <= 5 && ! in_array($chave, $feriados, true)) {
                $dias[$chave] = true;
            }
        }

        return $dias;
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
            if ($usados + $this->diasNovos($user, $tipo, $de, $ate, $ano, $excluirPedidoId) > $limite) {
                $restantes = max(0, $limite - $usados);
                $rotulo = self::ROTULOS[$tipo] ?? $tipo;

                return "Excede o limite de {$limite} dias úteis de {$rotulo} em {$ano}. Restam {$restantes}.";
            }
        }

        return null;
    }

    /** Dias uteis do intervalo no ano que ainda nao pesam no saldo: nas ferias, os que caem numa ponte (e fora de outro pedido) ja estao contados. */
    private function diasNovos(User $user, string $tipo, CarbonImmutable $de, CarbonImmutable $ate, int $ano, ?int $excluirPedidoId): int
    {
        $dias = $this->diasUteisNoAno($de, $ate, $ano);
        if ($tipo === 'ferias') {
            $jaContados = array_diff_key($this->diasDePontes($user, $ano), $this->uniao($this->pedidosDoAno($user, $tipo, $ano, $excluirPedidoId), $ano));

            return count(array_diff_key($dias, $jaContados));
        }

        return count($dias);
    }

    /**
     * Dias uteis do pedido de ferias acima dos 22 acumulados no ano. Ordena por data_inicio (depois id) os pedidos
     * pendentes+aprovados do mesmo utilizador; os dias que ultrapassam 22 contando por essa ordem sao o excedente.
     * Soma os anos que o pedido atravessa. Outros tipos, recusados e cancelados: 0.
     */
    public function diasExcedentes(Pedido $pedido): int
    {
        if (! $this->contaParaExcedente($pedido)) {
            return 0;
        }

        return $this->excedenteDe($pedido, $this->feriasAtivas([$pedido->user_id])->get($pedido->user_id, collect()));
    }

    /** Calcula os excedentes de uma listagem com 1 query (em vez de 1 por pedido). */
    public function anexarExcedentes(iterable $pedidos): void
    {
        $pedidos = collect($pedidos);
        $contam = $pedidos->filter(fn (Pedido $p) => $this->contaParaExcedente($p));
        $ativas = $contam->isEmpty() ? collect() : $this->feriasAtivas($contam->pluck('user_id')->unique()->all());

        foreach ($pedidos as $pedido) {
            $pedido->definirExcedentes($this->contaParaExcedente($pedido)
                ? $this->excedenteDe($pedido, $ativas->get($pedido->user_id, collect()))
                : 0);
        }
    }

    private function contaParaExcedente(Pedido $pedido): bool
    {
        return $pedido->tipo === 'ferias' && in_array($pedido->estado, ['pendente', 'aprovado'], true);
    }

    /**
     * Ferias pendentes+aprovadas dos utilizadores, por data_inicio (depois id), agrupadas por utilizador.
     *
     * @param  array<int, int>  $userIds
     * @return Collection<int, Collection<int, Pedido>>
     */
    private function feriasAtivas(array $userIds)
    {
        return Pedido::whereIn('user_id', $userIds)
            ->where('tipo', 'ferias')
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->orderBy('data_inicio')->orderBy('id')
            ->get(['id', 'user_id', 'data_inicio', 'data_fim'])
            ->groupBy('user_id');
    }

    /** @param  Collection<int, Pedido>  $ordenados */
    private function excedenteDe(Pedido $pedido, $ordenados): int
    {
        $inicio = CarbonImmutable::parse($pedido->data_inicio);
        $fim = CarbonImmutable::parse($pedido->data_fim);
        $total = 0;
        for ($ano = $inicio->year; $ano <= $fim->year; $ano++) {
            $acumulado = 0;
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
