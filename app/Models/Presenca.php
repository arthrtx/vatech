<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'data', 'entrada', 'saida'])]
class Presenca extends Model
{
    protected $table = 'presencas';

    protected function casts(): array
    {
        return ['data' => 'date:Y-m-d', 'entrada' => 'datetime', 'saida' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{id:int,user_id:int,user:array{id:int,nome:string}|null,data:string,entrada:string,saida:string|null} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->user ? ['id' => $this->user->id, 'nome' => $this->user->nome] : null,
            'data' => $this->data->format('Y-m-d'),
            'entrada' => $this->entrada->toIso8601String(),
            'saida' => $this->saida?->toIso8601String(),
        ];
    }
}
