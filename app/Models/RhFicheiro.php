<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'user_id', 'nome', 'caminho', 'mime', 'tamanho', 'criado_por'])]
class RhFicheiro extends Model
{
    protected $table = 'rh_ficheiros';

    /**
     * O `caminho` nunca sai na API.
     *
     * @return array{id:int,nome:string,tamanho:int,mime:string|null,criado_em:string|null}
     */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'tamanho' => (int) $this->tamanho,
            'mime' => $this->mime,
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
