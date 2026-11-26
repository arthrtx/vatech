<?php

namespace App\Models;

use App\Services\LimitesPedidoService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['empresa_id', 'user_id', 'tipo', 'subtipo', 'data_inicio', 'data_fim', 'hora_inicio', 'hora_fim', 'observacao', 'urgente', 'cor', 'estado', 'decidido_por', 'decidido_em', 'visto_em', 'motivo_recusa', 'criado_por'])]
class Pedido extends Model
{
    use HasFactory;

    protected $appends = ['dias_excedentes'];

    protected $hidden = ['autor'];

    private ?int $excedentesEmLote = null;

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

    /** Dias uteis de ferias acima dos 22 do ano (0 nos outros tipos). Regra em LimitesPedidoService::diasExcedentes. */
    protected function diasExcedentes(): Attribute
    {
        return Attribute::get(fn () => $this->excedentesEmLote ?? app(LimitesPedidoService::class)->diasExcedentes($this));
    }

    /** Valor calculado em lote pela listagem (LimitesPedidoService::anexarExcedentes); evita 1 query por pedido. */
    public function definirExcedentes(int $dias): void
    {
        $this->excedentesEmLote = $dias;
    }

    public function anexos(): HasMany
    {
        return $this->hasMany(Anexo::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Quem criou o pedido (relevante só quando foi em nome de outra pessoa). */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    /** `criado_por` sai como {id, nome} (só quando o autor é outra pessoa; precisa de `autor` carregado), senão null. */
    public function attributesToArray(): array
    {
        $dados = parent::attributesToArray();
        if (array_key_exists('criado_por', $dados)) {
            $autor = $this->criado_por && $this->criado_por !== $this->user_id && $this->relationLoaded('autor') ? $this->autor : null;
            $dados['criado_por'] = $autor ? ['id' => $autor->id, 'nome' => $autor->nome] : null;
        }

        return $dados;
    }
}
