<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Compromisso da agenda pessoal: reunião, chamada, lembrete... Só quem o marcou o vê. */
#[Fillable(['user_id', 'data', 'hora_inicio', 'hora_fim', 'titulo', 'tipo', 'descricao'])]
class Compromisso extends Model
{
    public const TIPOS = ['reuniao', 'chamada', 'lembrete', 'outro'];

    protected $table = 'compromissos';

    protected function casts(): array
    {
        return ['data' => 'date:Y-m-d'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{id:int,data:string,hora_inicio:string|null,hora_fim:string|null,titulo:string,tipo:string,descricao:string|null} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'data' => $this->data->format('Y-m-d'),
            'hora_inicio' => $this->hora_inicio,
            'hora_fim' => $this->hora_fim,
            'titulo' => $this->titulo,
            'tipo' => $this->tipo,
            'descricao' => $this->descricao,
        ];
    }
}
