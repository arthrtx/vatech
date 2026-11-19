<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['pedido_id', 'nome', 'caminho', 'mime', 'tamanho'])]
#[Hidden(['caminho', 'pedido_id', 'created_at', 'updated_at'])]
class Anexo extends Model
{
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
