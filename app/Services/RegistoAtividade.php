<?php

namespace App\Services;

use App\Models\RegistoAtividade as Registo;
use App\Models\User;
use Illuminate\Support\Str;
use Throwable;

/** Escreve no histórico de atividade; nunca parte o pedido que o chamou. */
class RegistoAtividade
{
    public static function registar(string $tipo, string $descricao, ?User $actor, ?User $alvo = null): void
    {
        try {
            $empresaId = $actor?->empresa_id ?? $alvo?->empresa_id;
            if ($empresaId === null || ! in_array($tipo, Registo::TIPOS, true)) {
                return;
            }

            Registo::create([
                'empresa_id' => $empresaId,
                'user_id' => $actor?->id,
                'tipo' => $tipo,
                'descricao' => Str::limit($descricao, 255, ''),
                'alvo_user_id' => $alvo?->id,
            ]);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
