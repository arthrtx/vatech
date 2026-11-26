<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['empresa_id', 'nome', 'base', 'permissoes'])]
class Tipo extends Model
{
    /** Nomes reservados aos papéis fixos. */
    public const NOMES_PROIBIDOS = ['administrador', 'funcionario', 'estagiario'];

    protected function casts(): array
    {
        return ['permissoes' => 'array'];
    }

    /**
     * Permissões do tipo: o que o admin gravou por cima dos predefinidos do papel-base.
     *
     * @return array<string,bool>
     */
    public function permissoesEfectivas(): array
    {
        return array_replace(
            Empresa::permissoesPredefinidas($this->base),
            array_intersect_key(array_map('boolval', $this->permissoes ?? []), array_flip(Empresa::chavesPermissoes())),
        );
    }

    /** @return array{id:int,nome:string,base:string,permissoes:array<string,bool>,em_uso:int} */
    public function toContrato(): array
    {
        $emUso = User::where('tipo_id', $this->id)->count()
            + Convite::validos()->where('tipo_id', $this->id)->count();

        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'base' => $this->base,
            'permissoes' => $this->permissoesEfectivas(),
            'em_uso' => $emUso,
        ];
    }
}
