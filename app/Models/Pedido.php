<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['empresa_id', 'user_id', 'tipo', 'subtipo', 'data_inicio', 'data_fim', 'hora_inicio', 'hora_fim', 'observacao', 'urgente', 'cor', 'estado', 'decidido_por', 'decidido_em', 'visto_em', 'motivo_recusa'])]
class Pedido extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date:Y-m-d',
            'data_fim' => 'date:Y-m-d',
            'decidido_em' => 'datetime',
            'visto_em' => 'datetime',
            'urgente' => 'boolean',
        ];
    }

    public function anexos(): HasMany
    {
        return $this->hasMany(Anexo::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
