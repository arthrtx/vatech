<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable(['user_id', 'data', 'entrada', 'saida', 'atrasada'])]
class Presenca extends Model
{
    protected $table = 'presencas';

    protected function casts(): array
    {
        return ['data' => 'date:Y-m-d', 'entrada' => 'datetime', 'saida' => 'datetime', 'atrasada' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{id:int,user_id:int,user:array{id:int,nome:string}|null,data:string,entrada:string,saida:string|null,atrasada:bool,almoco_min:int} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->user ? ['id' => $this->user->id, 'nome' => $this->user->nome] : null,
            'data' => $this->data->format('Y-m-d'),
            'entrada' => $this->entrada->toIso8601String(),
            'saida' => $this->saida?->toIso8601String(),
            'atrasada' => (bool) $this->atrasada,
            'almoco_min' => $this->minutosDeAlmoco(),
        ];
    }

    /**
     * Minutos do horário de almoço do estagiário que caem entre a entrada e a saída deste dia.
     * Se saiu antes do almoço ou entrou depois, não desconta nada; sem saída ainda, também não.
     */
    public function minutosDeAlmoco(): int
    {
        $u = $this->user;
        if (! $this->saida || ! $u?->almoco_inicio || ! $u->almoco_fim) {
            return 0;
        }
        $dia = $this->data->format('Y-m-d');
        $inicio = Carbon::parse("$dia {$u->almoco_inicio}", 'Europe/Lisbon');
        $fim = Carbon::parse("$dia {$u->almoco_fim}", 'Europe/Lisbon');
        $de = $this->entrada->greaterThan($inicio) ? $this->entrada : $inicio;
        $ate = $this->saida->lessThan($fim) ? $this->saida : $fim;

        return $ate->greaterThan($de) ? (int) round($de->diffInMinutes($ate)) : 0;
    }
}
