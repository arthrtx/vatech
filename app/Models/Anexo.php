<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['pedido_id', 'nome', 'mime', 'tamanho'])]
#[Hidden(['caminho', 'pedido_id', 'created_at', 'updated_at'])]
class Anexo extends Model
{
    public function conteudo(): HasOne
    {
        return $this->hasOne(AnexoConteudo::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
