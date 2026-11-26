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

    /** Minutos depois da hora de entrada do horário em que ainda não conta como atraso. */
    public const TOLERANCIA_MIN = 15;

    protected function casts(): array
    {
        return ['data' => 'date:Y-m-d', 'entrada' => 'datetime', 'saida' => 'datetime', 'atrasada' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{id:int,user_id:int,user:array{id:int,nome:string}|null,data:string,entrada:string,saida:string|null,atrasada:bool,atraso_min:int,almoco_min:int} */
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
            'atraso_min' => $this->minutosDeAtraso(),
            'almoco_min' => $this->minutosDeAlmoco(),
        ];
    }

    /**
     * Atraso na chegada, contado desde a hora de entrada do horário. Até TOLERANCIA_MIN depois dessa hora
     * não há atraso (0); passado esse limite conta o atraso todo. Só conta a chegada da manhã (entrada antes
     * do almoço): a volta do almoço não é atraso. Sem consultas extra (as listagens carregam o horário).
     */
    public function minutosDeAtraso(): int
    {
        if (! $this->user?->empresa) {
            return 0;
        }
        $h = $this->user->horario();
        $dia = $this->data->format('Y-m-d');
        $inicio = Carbon::parse("$dia {$h['entrada']}", 'Europe/Lisbon');
        $atraso = $inicio->diffInMinutes($this->entrada, false);
        if ($atraso <= self::TOLERANCIA_MIN || $this->entrada->greaterThanOrEqualTo(Carbon::parse("$dia {$h['almoco_inicio']}", 'Europe/Lisbon'))) {
            return 0;
        }

        return (int) floor($atraso);
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
