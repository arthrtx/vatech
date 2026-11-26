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

    /** Relações que o contrato precisa (a empresa dá o horário por defeito): sem N+1 nas listagens. */
    public const RELACOES = ['user:id,nome,empresa_id,horario_entrada,horario_saida,horario_almoco_inicio,almoco_minutos', 'user.empresa:id,horario_entrada,horario_saida,almoco_inicio,almoco_minutos'];

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
     * Minutos do almoço efectivo da pessoa (início + duração, horário próprio ou da empresa) que caem
     * entre a entrada e a saída deste dia. Sem saída ainda, não desconta nada.
     */
    public function minutosDeAlmoco(): int
    {
        if (! $this->saida || ! $this->user?->empresa) {
            return 0;
        }
        $h = $this->user->horario();
        $dia = $this->data->format('Y-m-d');
        $inicio = Carbon::parse("$dia {$h['almoco_inicio']}", 'Europe/Lisbon');
        $fim = $inicio->copy()->addMinutes($h['almoco_min']);
        $de = $this->entrada->greaterThan($inicio) ? $this->entrada : $inicio;
        $ate = $this->saida->lessThan($fim) ? $this->saida : $fim;

        return $ate->greaterThan($de) ? (int) round($de->diffInMinutes($ate)) : 0;
    }
}
