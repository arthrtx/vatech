<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'tipo', 'dias_ano'])]
class LimitePedido extends Model
{
    protected $table = 'limites_pedido';
}
