<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'user_id', 'titulo', 'valor', 'criado_por'])]
class RhInfo extends Model
{
    protected $table = 'rh_infos';

    /** @return array{id:int,titulo:string,valor:string,criado_em:string|null} */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'titulo' => $this->titulo,
            'valor' => $this->valor,
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
