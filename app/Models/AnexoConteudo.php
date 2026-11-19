<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Bytes de um anexo, em tabela à parte para as listas de pedidos não os carregarem. */
#[Fillable(['anexo_id', 'conteudo'])]
class AnexoConteudo extends Model
{
    protected $primaryKey = 'anexo_id';

    public $incrementing = false;

    public $timestamps = false;
}
