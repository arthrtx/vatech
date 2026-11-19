<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Calendario de dias uteis (segunda a sexta, sem feriados nacionais) usado na contagem dos limites.
 * Nao conta feriados municipais nem pontes (a localidade so existe no navegador).
 */
class LimiteFerias
{
    /** Dias uteis do intervalo [de, ate] que caem no ano indicado. */
    public static function diasUteis(CarbonImmutable $de, CarbonImmutable $ate, int $ano): int
    {
        $dia = $de->max(CarbonImmutable::create($ano, 1, 1))->startOfDay();
        $fim = $ate->min(CarbonImmutable::create($ano, 12, 31))->startOfDay();
        $feriados = self::feriadosNacionais($ano);
        $total = 0;

        for (; $dia->lte($fim); $dia = $dia->addDay()) {
            if ($dia->dayOfWeekIso <= 5 && ! in_array($dia->format('Y-m-d'), $feriados, true)) {
                $total++;
            }
        }

        return $total;
    }

    /** Feriados nacionais obrigatorios (Codigo do Trabalho, art. 234.o), como datas Y-m-d. */
    public static function feriadosNacionais(int $ano): array
    {
        $pascoa = self::pascoa($ano);

        return [
            "$ano-01-01",
            $pascoa->subDays(2)->format('Y-m-d'), // Sexta-feira Santa
            $pascoa->format('Y-m-d'),
            "$ano-04-25",
            "$ano-05-01",
            $pascoa->addDays(60)->format('Y-m-d'), // Corpo de Deus
            "$ano-06-10",
            "$ano-08-15",
            "$ano-10-05",
            "$ano-11-01",
            "$ano-12-01",
            "$ano-12-08",
            "$ano-12-25",
        ];
    }

    /** Domingo de Pascoa (Meeus/Jones/Butcher), igual ao do front-end. */
    private static function pascoa(int $ano): CarbonImmutable
    {
        $a = $ano % 19;
        $b = intdiv($ano, 100);
        $c = $ano % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $mes = intdiv($h + $l - 7 * $m + 114, 31);
        $dia = (($h + $l - 7 * $m + 114) % 31) + 1;

        return CarbonImmutable::create($ano, $mes, $dia);
    }
}
