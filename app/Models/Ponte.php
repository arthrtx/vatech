<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/** Dia (ou dias) de ponte da empresa: registado pelo admin, visto por toda a equipa na agenda. */
#[Fillable(['empresa_id', 'nome', 'data_inicio', 'data_fim'])]
#[Hidden(['empresa_id', 'created_at', 'updated_at'])]
class Ponte extends Model
{
    protected $table = 'pontes';

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date:Y-m-d',
            'data_fim' => 'date:Y-m-d',
        ];
    }
}
