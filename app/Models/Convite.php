<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'nome', 'email', 'papel', 'token', 'convidado_por', 'expira_em', 'usado_em'])]
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

    public function link(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/convite/'.$this->token;
    }

    /** @return array{id:int,nome:string,email:string,papel:string,expira_em:string,link:string} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'email' => $this->email,
            'papel' => $this->papel,
            'expira_em' => $this->expira_em->toIso8601String(),
            'link' => $this->link(),
        ];
    }
}
