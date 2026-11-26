<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Feriados nacionais obrigatorios de Portugal via Nager.Date (D17), em cache por ano. */
class FeriadosService
{
    private const URL = 'https://date.nager.at/api/v3/PublicHolidays/%d/PT';

    private const DIAS_CACHE = 30;

    private const MINUTOS_FALHA = 5;

    private const MIN_DATAS = 8;

    /** Datas Y-m-d dos feriados nacionais do ano, ou null se a API falhar (o chamador recorre ao calculo local). */
    public function nacionais(int $ano): ?array
    {
        $chave = "feriados.nager.pt.$ano";
        $chaveFalha = "feriados.nager.pt.$ano.falha";

        try {
            $cache = Cache::get($chave);
            if (is_array($cache) && $cache !== []) {
                return $cache;
            }

            if (Cache::has($chaveFalha)) {
                return null;
            }

            $datas = $this->obter($ano);
            if ($datas === null) {
                Cache::put($chaveFalha, true, now()->addMinutes(self::MINUTOS_FALHA));
                Log::warning("Feriados Nager.Date indisponiveis para $ano; a usar o calculo local.");

                return null;
            }

            Cache::put($chave, $datas, now()->addDays(self::DIAS_CACHE));

            return $datas;
        } catch (Throwable $e) {
            try {
                Cache::put($chaveFalha, true, now()->addMinutes(self::MINUTOS_FALHA));
            } catch (Throwable) {
            }
            Log::warning("Feriados Nager.Date falharam para $ano ({$e->getMessage()}); a usar o calculo local.");

            return null;
        }
    }

    private function obter(int $ano): ?array
    {
        $resposta = Http::timeout(5)->retry(2, 200, throw: false)->acceptJson()->get(sprintf(self::URL, $ano));
        if (! $resposta->successful() || ! is_array($lista = $resposta->json())) {
            return null;
        }

        $datas = [];
        foreach ($lista as $f) {
            if (is_array($f) && ($f['global'] ?? null) === true && in_array('Public', (array) ($f['types'] ?? []), true)
                && is_string($f['date'] ?? null) && preg_match('/^'.$ano.'-\d{2}-\d{2}$/', $f['date']) === 1) {
                $datas[] = $f['date'];
            }
        }

        $datas = array_values(array_unique($datas));

        return count($datas) < self::MIN_DATAS ? null : $datas;
    }
}
