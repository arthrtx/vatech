<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'user_id', 'nome', 'categoria', 'categoria_nome', 'caminho', 'mime', 'tamanho', 'criado_por'])]
class RhFicheiro extends Model
{
    public const CATEGORIAS = ['declaracao', 'documentos_estagio', 'contrato', 'recibo', 'outro', 'personalizado'];

    protected $table = 'rh_ficheiros';

    /**
     * O `caminho` nunca sai na API.
     *
     * @return array{id:int,nome:string,categoria:string,categoria_nome:string|null,tamanho:int,mime:string|null,criado_em:string|null}
     */
    public function toContrato(): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'categoria' => $this->categoria ?? 'outro',
            'categoria_nome' => $this->categoria_nome,
            'tamanho' => (int) $this->tamanho,
            'mime' => $this->mime,
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
