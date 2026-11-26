<?php

namespace App\Console\Commands;

use App\Models\RegistoAtividade;
use Illuminate\Console\Command;

class LimparHistorico extends Command
{
    protected $signature = 'historico:limpar';

    protected $description = 'Apaga do histórico de atividade o que for mais antigo que historico.retencao_meses';

    public function handle(): int
    {
        $limite = now()->subMonths(max(1, (int) config('historico.retencao_meses', 6)));
        $apagados = 0;

        do {
            $n = RegistoAtividade::where('created_at', '<', $limite)->limit(1000)->delete();
            $apagados += $n;
        } while ($n > 0);

        $this->info("Histórico: {$apagados} linhas apagadas (anteriores a {$limite->toDateString()}).");

        return self::SUCCESS;
    }
}
