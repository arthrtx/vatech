<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Linha do histórico de atividade da empresa. Nunca guarda dados sensíveis (D22). */
#[Fillable(['empresa_id', 'user_id', 'tipo', 'descricao', 'alvo_user_id'])]
class RegistoAtividade extends Model
{
    public const UPDATED_AT = null;

    public const TIPOS = ['convite', 'pedido', 'conta', 'rh', 'estagio', 'ponte', 'presenca', 'definicoes', 'sessao'];

    protected $table = 'registos_atividade';

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function alvo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alvo_user_id')->withTrashed();
    }

    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'tipo' => $this->tipo,
            'descricao' => $this->descricao,
            'actor' => $this->actor ? ['id' => $this->actor->id, 'nome' => $this->actor->nome] : null,
            'alvo' => $this->alvo ? ['id' => $this->alvo->id, 'nome' => $this->alvo->nome] : null,
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
