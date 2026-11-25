<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'data', 'tipo', 'motivo', 'descricao'])]
class Ocorrencia extends Model
{
    public const TIPOS = ['falta', 'atraso'];

    public const MOTIVOS = ['imprevisto', 'doenca', 'transportes', 'outro'];

    protected $table = 'ocorrencias';

    protected function casts(): array
    {
        return ['data' => 'date:Y-m-d'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{id:int,user_id:int,user:array{id:int,nome:string}|null,data:string,tipo:string,motivo:string,descricao:string} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->user ? ['id' => $this->user->id, 'nome' => $this->user->nome] : null,
            'data' => $this->data->format('Y-m-d'),
            'tipo' => $this->tipo,
            'motivo' => $this->motivo,
            'descricao' => $this->descricao,
        ];
    }
}
