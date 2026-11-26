<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['empresa_id', 'nome', 'email', 'papel', 'token', 'convidado_por', 'expira_em', 'usado_em', 'tipo_id'])]
class Convite extends Model
{
    protected function casts(): array
    {
        return ['expira_em' => 'datetime', 'usado_em' => 'datetime'];
    }

    /** Por usar e dentro do prazo. */
    public function scopeValidos(Builder $query): Builder
    {
        return $query->whereNull('usado_em')->where('expira_em', '>', now());
    }

    public function tipo(): BelongsTo
    {
        return $this->belongsTo(Tipo::class);
    }

    public function link(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/convite/'.$this->token;
    }

    /** @return array{id:int,nome:string,email:string,papel:string,tipo_id:int|null,tipo_nome:string|null,expira_em:string,link:string} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'email' => $this->email,
            'papel' => $this->papel,
            'tipo_id' => $this->tipo_id,
            'tipo_nome' => $this->tipo?->nome,
            'expira_em' => $this->expira_em->toIso8601String(),
            'link' => $this->link(),
        ];
    }
}
